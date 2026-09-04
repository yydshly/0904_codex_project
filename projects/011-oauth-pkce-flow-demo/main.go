package main

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"flag"
	"fmt"
	"html/template"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"os/signal"
	"path/filepath"
	"strings"
	"sync"
	"syscall"
	"time"
)

type pendingLogin struct {
	Verifier string
	Created  time.Time
}

type authorizationCode struct {
	Challenge   string
	RedirectURI string
	Email       string
	Used        bool
}

type accessGrant struct {
	Email     string
	ExpiresAt time.Time
}

type storedAuth struct {
	Type         string `json:"type"`
	AccessToken  string `json:"access_token"`
	RefreshToken string `json:"refresh_token"`
	IDToken      string `json:"id_token"`
	AccountID    string `json:"account_id"`
	Email        string `json:"email"`
	Expired      string `json:"expired"`
	LastRefresh  string `json:"last_refresh"`
}

type event struct {
	At      string
	Actor   string
	Message string
}

type demo struct {
	mu sync.Mutex

	clientBase string
	authBase   string
	authFile   string

	pending       map[string]pendingLogin
	codes         map[string]*authorizationCode
	accessTokens  map[string]accessGrant
	refreshTokens map[string]string
	current       *storedAuth
	events        []event
}

type pageData struct {
	ClientBase    string
	AuthBase      string
	Authenticated bool
	Auth          *storedAuth
	AuthID        string
	AuthFile      string
	Events        []event
	Message       string
	Error         string
	CallbackURL   string
	Code          string
	ResponseJSON  string
}

func main() {
	clientAddr := flag.String("client-addr", "127.0.0.1:18080", "address for the OAuth client / gateway demo")
	authAddr := flag.String("auth-addr", "127.0.0.1:18081", "address for the mock OAuth provider")
	authFile := flag.String("auth-file", filepath.Join("data", "codex-demo-auth.json"), "where the fake credential is stored")
	flag.Parse()

	d := &demo{
		clientBase:    "http://" + *clientAddr,
		authBase:      "http://" + *authAddr,
		authFile:      *authFile,
		pending:       make(map[string]pendingLogin),
		codes:         make(map[string]*authorizationCode),
		accessTokens:  make(map[string]accessGrant),
		refreshTokens: make(map[string]string),
	}
	if err := d.loadAuth(); err != nil && !errors.Is(err, os.ErrNotExist) {
		log.Printf("load demo auth: %v", err)
	}

	clientServer := &http.Server{Addr: *clientAddr, Handler: d.clientMux(), ReadHeaderTimeout: 5 * time.Second}
	authServer := &http.Server{Addr: *authAddr, Handler: d.authMux(), ReadHeaderTimeout: 5 * time.Second}

	errCh := make(chan error, 2)
	go func() {
		log.Printf("mock OAuth provider: %s", d.authBase)
		errCh <- authServer.ListenAndServe()
	}()
	go func() {
		log.Printf("OAuth client demo:    %s", d.clientBase)
		log.Printf("open this page:       %s", d.clientBase)
		errCh <- clientServer.ListenAndServe()
	}()

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, os.Interrupt, syscall.SIGTERM)
	select {
	case sig := <-sigCh:
		log.Printf("received %s; shutting down", sig)
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Printf("server stopped: %v", err)
		}
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	_ = clientServer.Shutdown(ctx)
	_ = authServer.Shutdown(ctx)
}

func (d *demo) clientMux() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /", d.handleHome)
	mux.HandleFunc("GET /login", d.handleLogin)
	mux.HandleFunc("GET /callback", d.handleCallback)
	mux.HandleFunc("POST /call-codex", d.handleCallCodex)
	mux.HandleFunc("POST /refresh", d.handleRefresh)
	mux.HandleFunc("POST /expire", d.handleExpire)
	mux.HandleFunc("POST /reset", d.handleReset)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "ok") })
	return mux
}

func (d *demo) authMux() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /authorize", d.handleAuthorize)
	mux.HandleFunc("POST /approve", d.handleApprove)
	mux.HandleFunc("POST /token", d.handleToken)
	mux.HandleFunc("POST /codex/responses", d.handleMockCodex)
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { _, _ = io.WriteString(w, "ok") })
	return mux
}

func (d *demo) handleHome(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	data := d.pageDataLocked()
	d.mu.Unlock()
	data.Message = r.URL.Query().Get("message")
	render(w, homeTemplate, data)
}

func (d *demo) handleLogin(w http.ResponseWriter, r *http.Request) {
	state := randomToken("state", 18)
	verifier := randomToken("verifier", 48)
	challenge := pkceChallenge(verifier)

	d.mu.Lock()
	d.pending[state] = pendingLogin{Verifier: verifier, Created: time.Now()}
	d.addEventLocked("代码", "生成 state 与 PKCE，并把 verifier 留在内存中")
	d.mu.Unlock()

	q := url.Values{
		"client_id":             {"demo-codex-cli"},
		"redirect_uri":          {d.clientBase + "/callback"},
		"response_type":         {"code"},
		"scope":                 {"openid email profile offline_access"},
		"state":                 {state},
		"code_challenge":        {challenge},
		"code_challenge_method": {"S256"},
	}
	http.Redirect(w, r, d.authBase+"/authorize?"+q.Encode(), http.StatusFound)
}

func (d *demo) handleAuthorize(w http.ResponseWriter, r *http.Request) {
	d.addEvent("浏览器", "到达模拟 OpenAI 登录与授权页面")
	data := struct {
		ClientID    string
		RedirectURI string
		State       string
		Challenge   string
		Scope       string
	}{
		ClientID:    r.URL.Query().Get("client_id"),
		RedirectURI: r.URL.Query().Get("redirect_uri"),
		State:       r.URL.Query().Get("state"),
		Challenge:   r.URL.Query().Get("code_challenge"),
		Scope:       r.URL.Query().Get("scope"),
	}
	if data.ClientID == "" || data.RedirectURI == "" || data.State == "" || data.Challenge == "" {
		http.Error(w, "missing OAuth parameters", http.StatusBadRequest)
		return
	}
	render(w, authorizeTemplate, data)
}

func (d *demo) handleApprove(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	redirectURI := r.Form.Get("redirect_uri")
	state := r.Form.Get("state")
	if r.Form.Get("decision") == "deny" {
		q := url.Values{"error": {"access_denied"}, "state": {state}}
		http.Redirect(w, r, redirectURI+"?"+q.Encode(), http.StatusFound)
		return
	}

	email := strings.TrimSpace(r.Form.Get("email"))
	if email == "" {
		email = "demo@example.com"
	}
	code := randomToken("code", 24)
	d.mu.Lock()
	d.codes[code] = &authorizationCode{
		Challenge:   r.Form.Get("code_challenge"),
		RedirectURI: redirectURI,
		Email:       email,
	}
	d.addEventLocked("认证服务", "用户授权成功，签发一次性 auth_code")
	d.mu.Unlock()

	q := url.Values{"code": {code}, "state": {state}}
	http.Redirect(w, r, redirectURI+"?"+q.Encode(), http.StatusFound)
}

func (d *demo) handleCallback(w http.ResponseWriter, r *http.Request) {
	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state")
	if oauthErr := r.URL.Query().Get("error"); oauthErr != "" {
		render(w, resultTemplate, pageData{ClientBase: d.clientBase, Error: "授权被拒绝：" + oauthErr})
		return
	}
	if code == "" || state == "" {
		render(w, resultTemplate, pageData{
			ClientBase: d.clientBase,
			Error:      "这个回调地址缺少 code/state。直接打开 /callback 不会完成登录，必须由认证服务器重定向回来。",
		})
		return
	}

	d.mu.Lock()
	pending, ok := d.pending[state]
	if ok {
		delete(d.pending, state)
		d.addEventLocked("本地回调", "浏览器请求 localhost，把 auth_code 与 state 交给代码")
	}
	d.mu.Unlock()
	if !ok || time.Since(pending.Created) > 5*time.Minute {
		render(w, resultTemplate, pageData{ClientBase: d.clientBase, Error: "state 无效或已经过期"})
		return
	}

	form := url.Values{
		"grant_type":    {"authorization_code"},
		"client_id":     {"demo-codex-cli"},
		"code":          {code},
		"redirect_uri":  {d.clientBase + "/callback"},
		"code_verifier": {pending.Verifier},
	}
	token, body, err := d.exchangeToken(r.Context(), form)
	if err != nil {
		render(w, resultTemplate, pageData{ClientBase: d.clientBase, Error: err.Error(), ResponseJSON: string(body)})
		return
	}
	if err := d.saveAuth(token); err != nil {
		render(w, resultTemplate, pageData{ClientBase: d.clientBase, Error: err.Error()})
		return
	}

	d.addEvent("代码", "用 auth_code + verifier 换到 Token，并创建 Auth 对象")
	pretty, _ := json.MarshalIndent(token, "", "  ")
	render(w, resultTemplate, pageData{
		ClientBase:   d.clientBase,
		Message:      "授权成功：浏览器阶段已经结束，后续请求只由代码携带 Token 完成。",
		CallbackURL:  r.URL.String(),
		Code:         code,
		ResponseJSON: string(pretty),
	})
}

func (d *demo) handleCallCodex(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	current := cloneAuth(d.current)
	d.mu.Unlock()
	if current == nil {
		redirectMessage(w, r, d.clientBase, "尚未授权，没有可调度的 Auth")
		return
	}

	body := strings.NewReader(`{"model":"demo-codex","input":"请解释 OAuth 回调"}`)
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, d.authBase+"/codex/responses", body)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+current.AccessToken)

	d.addEvent("CodexExecutor", "从 Auth 读取 access_token，并写入 Authorization: Bearer …")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadGateway)
		return
	}
	defer resp.Body.Close()
	responseBody, _ := io.ReadAll(resp.Body)
	d.addEvent("模拟 Codex", fmt.Sprintf("返回 HTTP %d，Auth Manager 可据此更新状态", resp.StatusCode))

	var prettyJSON any
	display := string(responseBody)
	if json.Unmarshal(responseBody, &prettyJSON) == nil {
		if pretty, errPretty := json.MarshalIndent(prettyJSON, "", "  "); errPretty == nil {
			display = string(pretty)
		}
	}
	render(w, resultTemplate, pageData{
		ClientBase:   d.clientBase,
		Message:      "模拟 Codex 请求已经完成。",
		ResponseJSON: display,
	})
}

func (d *demo) handleRefresh(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	current := cloneAuth(d.current)
	d.mu.Unlock()
	if current == nil {
		redirectMessage(w, r, d.clientBase, "尚未授权，无法刷新")
		return
	}

	form := url.Values{
		"grant_type":    {"refresh_token"},
		"client_id":     {"demo-codex-cli"},
		"refresh_token": {current.RefreshToken},
	}
	token, _, err := d.exchangeToken(r.Context(), form)
	if err != nil {
		redirectMessage(w, r, d.clientBase, "刷新失败："+err.Error())
		return
	}
	if err := d.saveAuth(token); err != nil {
		redirectMessage(w, r, d.clientBase, "保存失败："+err.Error())
		return
	}
	d.addEvent("代码", "使用 refresh_token 获得新 access_token")
	redirectMessage(w, r, d.clientBase, "Token 已刷新；浏览器没有参与刷新过程")
}

func (d *demo) handleExpire(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	if d.current == nil {
		d.mu.Unlock()
		redirectMessage(w, r, d.clientBase, "尚未授权")
		return
	}
	if grant, ok := d.accessTokens[d.current.AccessToken]; ok {
		grant.ExpiresAt = time.Now().Add(-time.Minute)
		d.accessTokens[d.current.AccessToken] = grant
	}
	d.current.Expired = time.Now().Add(-time.Minute).Format(time.RFC3339)
	current := cloneAuth(d.current)
	d.addEventLocked("演示器", "强制令当前 access_token 过期")
	d.mu.Unlock()
	_ = d.persistAuth(current)
	redirectMessage(w, r, d.clientBase, "Access Token 已被模拟为过期；现在调用 Codex 会得到 401")
}

func (d *demo) handleReset(w http.ResponseWriter, r *http.Request) {
	d.mu.Lock()
	d.current = nil
	d.pending = make(map[string]pendingLogin)
	d.codes = make(map[string]*authorizationCode)
	d.accessTokens = make(map[string]accessGrant)
	d.refreshTokens = make(map[string]string)
	d.events = nil
	d.mu.Unlock()
	if err := os.Remove(d.authFile); err != nil && !errors.Is(err, os.ErrNotExist) {
		redirectMessage(w, r, d.clientBase, "重置失败："+err.Error())
		return
	}
	redirectMessage(w, r, d.clientBase, "演示状态已经重置")
}

func (d *demo) handleToken(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_request"})
		return
	}
	switch r.Form.Get("grant_type") {
	case "authorization_code":
		d.exchangeAuthorizationCode(w, r)
	case "refresh_token":
		d.exchangeRefreshToken(w, r)
	default:
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "unsupported_grant_type"})
	}
}

func (d *demo) exchangeAuthorizationCode(w http.ResponseWriter, r *http.Request) {
	code := r.Form.Get("code")
	verifier := r.Form.Get("code_verifier")
	d.mu.Lock()
	record, ok := d.codes[code]
	if !ok || record.Used || record.RedirectURI != r.Form.Get("redirect_uri") || pkceChallenge(verifier) != record.Challenge {
		d.mu.Unlock()
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_grant", "hint": "code、redirect_uri 或 PKCE verifier 不匹配"})
		return
	}
	record.Used = true
	token := d.issueTokenLocked(record.Email, "")
	d.addEventLocked("认证服务", "校验 auth_code 与 PKCE 成功，签发 Access/Refresh Token")
	d.mu.Unlock()
	writeToken(w, token)
}

func (d *demo) exchangeRefreshToken(w http.ResponseWriter, r *http.Request) {
	refreshToken := r.Form.Get("refresh_token")
	d.mu.Lock()
	email, ok := d.refreshTokens[refreshToken]
	if !ok {
		d.mu.Unlock()
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": "invalid_grant"})
		return
	}
	token := d.issueTokenLocked(email, refreshToken)
	d.addEventLocked("认证服务", "校验 refresh_token，签发新的 access_token")
	d.mu.Unlock()
	writeToken(w, token)
}

func (d *demo) issueTokenLocked(email, existingRefresh string) *storedAuth {
	now := time.Now()
	accessToken := randomToken("at", 24)
	refreshToken := existingRefresh
	if refreshToken == "" {
		refreshToken = randomToken("rt", 32)
	}
	accountHash := sha256.Sum256([]byte(strings.ToLower(email)))
	accountID := fmt.Sprintf("acct_%x", accountHash[:6])
	expiresAt := now.Add(2 * time.Minute)
	d.accessTokens[accessToken] = accessGrant{Email: email, ExpiresAt: expiresAt}
	d.refreshTokens[refreshToken] = email
	return &storedAuth{
		Type:         "codex",
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		IDToken:      fakeIDToken(email, accountID, expiresAt),
		AccountID:    accountID,
		Email:        email,
		Expired:      expiresAt.Format(time.RFC3339),
		LastRefresh:  now.Format(time.RFC3339),
	}
}

func (d *demo) handleMockCodex(w http.ResponseWriter, r *http.Request) {
	token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
	d.mu.Lock()
	grant, ok := d.accessTokens[token]
	d.mu.Unlock()
	if !ok || token == "" {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "missing_or_invalid_access_token"})
		return
	}
	if !grant.ExpiresAt.After(time.Now()) {
		writeJSON(w, http.StatusUnauthorized, map[string]any{"error": "access_token_expired"})
		return
	}
	var requestBody map[string]any
	_ = json.NewDecoder(r.Body).Decode(&requestBody)
	writeJSON(w, http.StatusOK, map[string]any{
		"id":     randomToken("resp", 8),
		"object": "response",
		"model":  requestBody["model"],
		"output": []map[string]any{{
			"role":    "assistant",
			"content": "这是模拟 Codex 响应。认证成功，因为 Executor 携带了 Auth 中的 access_token。",
		}},
		"authenticated_account": grant.Email,
	})
}

func (d *demo) exchangeToken(ctx context.Context, form url.Values) (*storedAuth, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, d.authBase+"/token", strings.NewReader(form.Encode()))
	if err != nil {
		return nil, nil, err
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, nil, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, body, err
	}
	if resp.StatusCode != http.StatusOK {
		return nil, body, fmt.Errorf("token endpoint returned HTTP %d", resp.StatusCode)
	}
	var payload struct {
		AccessToken  string `json:"access_token"`
		RefreshToken string `json:"refresh_token"`
		IDToken      string `json:"id_token"`
		ExpiresIn    int    `json:"expires_in"`
		AccountID    string `json:"account_id"`
		Email        string `json:"email"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		return nil, body, err
	}
	now := time.Now()
	return &storedAuth{
		Type:         "codex",
		AccessToken:  payload.AccessToken,
		RefreshToken: payload.RefreshToken,
		IDToken:      payload.IDToken,
		AccountID:    payload.AccountID,
		Email:        payload.Email,
		Expired:      now.Add(time.Duration(payload.ExpiresIn) * time.Second).Format(time.RFC3339),
		LastRefresh:  now.Format(time.RFC3339),
	}, body, nil
}

func writeToken(w http.ResponseWriter, token *storedAuth) {
	expiresAt, _ := time.Parse(time.RFC3339, token.Expired)
	writeJSON(w, http.StatusOK, map[string]any{
		"access_token":  token.AccessToken,
		"refresh_token": token.RefreshToken,
		"id_token":      token.IDToken,
		"token_type":    "Bearer",
		"expires_in":    max(0, int(time.Until(expiresAt).Seconds())),
		"account_id":    token.AccountID,
		"email":         token.Email,
	})
}

func (d *demo) saveAuth(auth *storedAuth) error {
	if err := d.persistAuth(auth); err != nil {
		return err
	}
	d.mu.Lock()
	d.current = cloneAuth(auth)
	d.mu.Unlock()
	return nil
}

func (d *demo) persistAuth(auth *storedAuth) error {
	if err := os.MkdirAll(filepath.Dir(d.authFile), 0o700); err != nil {
		return err
	}
	data, err := json.MarshalIndent(auth, "", "  ")
	if err != nil {
		return err
	}
	return os.WriteFile(d.authFile, append(data, '\n'), 0o600)
}

func (d *demo) loadAuth() error {
	data, err := os.ReadFile(d.authFile)
	if err != nil {
		return err
	}
	var auth storedAuth
	if err := json.Unmarshal(data, &auth); err != nil {
		return err
	}
	d.current = &auth
	if auth.AccessToken != "" {
		expiresAt, _ := time.Parse(time.RFC3339, auth.Expired)
		d.accessTokens[auth.AccessToken] = accessGrant{Email: auth.Email, ExpiresAt: expiresAt}
	}
	if auth.RefreshToken != "" {
		d.refreshTokens[auth.RefreshToken] = auth.Email
	}
	return nil
}

func (d *demo) pageDataLocked() pageData {
	copyEvents := append([]event(nil), d.events...)
	data := pageData{
		ClientBase:    d.clientBase,
		AuthBase:      d.authBase,
		Authenticated: d.current != nil,
		Auth:          cloneAuth(d.current),
		AuthFile:      d.authFile,
		Events:        copyEvents,
	}
	if d.current != nil {
		data.AuthID = "codex-demo-" + strings.ReplaceAll(d.current.Email, "@", "-")
	}
	return data
}

func (d *demo) addEvent(actor, message string) {
	d.mu.Lock()
	d.addEventLocked(actor, message)
	d.mu.Unlock()
}

func (d *demo) addEventLocked(actor, message string) {
	d.events = append([]event{{At: time.Now().Format("15:04:05"), Actor: actor, Message: message}}, d.events...)
	if len(d.events) > 14 {
		d.events = d.events[:14]
	}
}

func pkceChallenge(verifier string) string {
	sum := sha256.Sum256([]byte(verifier))
	return base64.RawURLEncoding.EncodeToString(sum[:])
}

func randomToken(prefix string, n int) string {
	b := make([]byte, n)
	if _, err := rand.Read(b); err != nil {
		panic(err)
	}
	return prefix + "_" + base64.RawURLEncoding.EncodeToString(b)
}

func fakeIDToken(email, accountID string, expires time.Time) string {
	header, _ := json.Marshal(map[string]any{"alg": "none", "typ": "JWT"})
	payload, _ := json.Marshal(map[string]any{"email": email, "account_id": accountID, "exp": expires.Unix()})
	return base64.RawURLEncoding.EncodeToString(header) + "." + base64.RawURLEncoding.EncodeToString(payload) + ".demo"
}

func cloneAuth(auth *storedAuth) *storedAuth {
	if auth == nil {
		return nil
	}
	copy := *auth
	return &copy
}

func redirectMessage(w http.ResponseWriter, r *http.Request, base, message string) {
	http.Redirect(w, r, base+"/?message="+url.QueryEscape(message), http.StatusSeeOther)
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func render(w http.ResponseWriter, tmpl *template.Template, data any) {
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	if err := tmpl.Execute(w, data); err != nil {
		log.Printf("render template: %v", err)
	}
}

var commonCSS = `
:root { color-scheme: light dark; font-family: Inter, "Microsoft YaHei", system-ui, sans-serif; scroll-behavior: smooth; }
* { box-sizing: border-box; }
body { margin: 0; background: light-dark(#f6f8fb, #101419); color: light-dark(#1c2632, #e7edf5); }
main { width: min(1180px, calc(100% - 32px)); margin: 32px auto 72px; }
h1 { font-size: clamp(28px, 4.5vw, 48px); line-height: 1.15; margin: 0 0 14px; font-weight: 600; letter-spacing: -.025em; }
h2 { font-size: clamp(21px, 3vw, 28px); margin: 0 0 12px; font-weight: 600; }
h3 { font-size: 17px; margin: 0 0 10px; font-weight: 600; }
p, li { line-height: 1.7; }
a { color: light-dark(#1859c7, #8bb4ff); }
.muted { color: light-dark(#657286, #9ba8b9); }
.eyebrow { margin: 0 0 9px; text-transform: uppercase; letter-spacing: .12em; font-size: 12px; color: light-dark(#1859c7, #8bb4ff); font-weight: 600; }
.hero { padding: 8px 0 28px; max-width: 900px; }
.hero .lead { font-size: clamp(17px, 2vw, 21px); line-height: 1.65; margin: 0; max-width: 850px; }
.hero-meta { display: flex; flex-wrap: wrap; gap: 8px 16px; margin-top: 16px; color: light-dark(#657286, #9ba8b9); font-size: 13px; }
.layout { display: grid; grid-template-columns: 210px minmax(0, 1fr); gap: 34px; align-items: start; }
.toc { position: sticky; top: 20px; display: grid; gap: 3px; padding-top: 10px; }
.toc strong { margin-bottom: 8px; }
.toc a { color: light-dark(#566377, #aeb8c7); text-decoration: none; padding: 7px 9px; border-radius: 7px; }
.toc a:hover { background: light-dark(#e9eef6, #1d2530); color: inherit; }
.content { min-width: 0; }
.section { scroll-margin-top: 20px; padding: 30px 0; border-top: 1px solid light-dark(#dfe5ee, #2d3642); }
.section:first-child { padding-top: 0; border-top: 0; }
.section-intro { max-width: 780px; margin: 0 0 20px; color: light-dark(#586679, #aeb9c8); }
.grid { display: grid; grid-template-columns: 1.08fr .92fr; gap: 16px; }
.grid.equal { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid.three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.card { background: light-dark(#fff, #181e26); border: 1px solid light-dark(#dfe5ee, #303947); border-radius: 14px; padding: 19px; }
.callout { border-left: 4px solid light-dark(#2766d7, #75a4ff); padding: 14px 16px; background: light-dark(#eef4ff, #15243b); border-radius: 0 10px 10px 0; line-height: 1.7; }
.callout.warn { border-left-color: light-dark(#b86a05, #ffc266); background: light-dark(#fff5e6, #352718); }
.actions { display: flex; flex-wrap: wrap; gap: 10px; margin: 16px 0 4px; }
button, .button { appearance: none; border: 0; border-radius: 9px; padding: 11px 15px; font: inherit; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; background: light-dark(#e8edf5, #2a3340); color: inherit; }
button:hover, .button:hover { filter: brightness(.97); }
.primary { background: light-dark(#185adb, #4c86f7); color: #fff; }
.danger { background: light-dark(#fbe5e5, #4a2528); color: light-dark(#9d2525, #ffb8b8); }
.status { display: inline-block; padding: 5px 9px; border-radius: 999px; background: light-dark(#e2f5ea, #173725); color: light-dark(#146c39, #8ee0ad); }
.status.off { background: light-dark(#eef0f4, #292f38); color: light-dark(#687386, #adb7c5); }
.flow { display: grid; gap: 8px; counter-reset: flow-step; }
.flow div { counter-increment: flow-step; padding: 11px 13px 11px 44px; position: relative; border-left: 3px solid light-dark(#4f7ee8, #71a0ff); background: light-dark(#f2f6ff, #17243a); border-radius: 0 9px 9px 0; }
.flow div::before { content: counter(flow-step); position: absolute; left: 14px; top: 11px; font-weight: 600; color: light-dark(#1859c7, #8bb4ff); }
.flow span { color: light-dark(#5d6878, #a7b3c4); }
.chain { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; margin: 16px 0; }
.chain > span { padding: 9px 11px; background: light-dark(#eef2f7, #202833); border-radius: 8px; }
.chain > b { color: light-dark(#7a8798, #8f9cad); }
.concepts { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.concept { padding: 15px 0; border-top: 2px solid light-dark(#dfe5ee, #303947); }
.concept strong { display: block; margin-bottom: 5px; }
.concept p { margin: 0; color: light-dark(#5e6b7d, #a8b3c2); }
.role { display: grid; grid-template-columns: 132px 1fr; gap: 14px; padding: 13px 0; border-bottom: 1px solid light-dark(#e7ebf1, #29323d); }
.role:last-child { border-bottom: 0; }
.role strong { color: light-dark(#24344b, #dce7f7); }
.role > * { min-width: 0; }
.role code { overflow-wrap: anywhere; word-break: break-word; }
dl { display: grid; grid-template-columns: 120px minmax(0, 1fr); gap: 9px 12px; margin: 0; }
dt { color: light-dark(#667386, #9ba8ba); }
dd { margin: 0; word-break: break-all; }
code, pre { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; }
code { font-size: .92em; }
pre { white-space: pre-wrap; overflow-wrap: anywhere; padding: 14px; border-radius: 9px; background: light-dark(#f0f3f8, #10151c); line-height: 1.65; }
.event { display: grid; grid-template-columns: 70px 88px 1fr; gap: 8px; padding: 9px 0; border-bottom: 1px solid light-dark(#e8ecf2, #2a323e); }
.event:last-child { border-bottom: 0; }
.message { margin: 0 0 18px; padding: 12px 15px; border-radius: 10px; background: light-dark(#e8f3ff, #172c43); }
.error { background: light-dark(#feecec, #422326); color: light-dark(#8c2020, #ffb6b6); }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; min-width: 620px; }
th, td { text-align: left; vertical-align: top; padding: 11px 10px; border-bottom: 1px solid light-dark(#e1e6ed, #2c3541); line-height: 1.55; }
th { color: light-dark(#526074, #b9c4d2); font-weight: 600; }
details { border-top: 1px solid light-dark(#e1e6ed, #2c3541); padding: 12px 0; }
details:last-child { padding-bottom: 0; }
summary { cursor: pointer; font-weight: 600; }
details p { margin-bottom: 0; }
.checklist { padding-left: 20px; margin: 8px 0 0; }
.checklist li { margin: 6px 0; }
.tag { display: inline-block; border: 1px solid light-dark(#ccd5e1, #3a4655); border-radius: 999px; padding: 3px 8px; margin: 2px 3px 2px 0; font-size: 12px; color: light-dark(#566477, #b0bdcc); }
form.inline { display: inline; }
input { width: 100%; padding: 11px 12px; border: 1px solid light-dark(#ccd5e2, #3b4655); border-radius: 10px; font: inherit; background: light-dark(#fff, #121820); color: inherit; }
label { display: block; margin: 14px 0 6px; }
@media (max-width: 900px) { .layout { grid-template-columns: minmax(0, 1fr); gap: 12px; min-width: 0; } .toc { position: static; display: flex; overflow-x: auto; white-space: nowrap; max-width: 100%; padding: 0 0 12px; } .toc strong { display: none; } }
@media (max-width: 700px) { main { width: min(100% - 20px, 700px); margin-top: 20px; } .grid, .grid.equal, .grid.three, .concepts { grid-template-columns: 1fr; } .role { grid-template-columns: 1fr; gap: 4px; } .event { grid-template-columns: 62px 78px 1fr; } .hero { padding-bottom: 20px; } .section { padding: 25px 0; } }
`

var homeTemplate = template.Must(template.New("home").Parse(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OAuth、Callback 与凭证调度参考</title><style>` + commonCSS + `</style></head>
<body><main>
  <header class="hero">
    <p class="eyebrow">Local OAuth Lab · Implementation Reference</p>
    <h1>从浏览器授权，到代码持有凭证</h1>
    <p class="lead">浏览器负责让用户在认证提供方完成登录；Callback 把一次性授权结果交给代码；代码换取并保存 Token；网关随后选择 Auth，代表该用户调用上游。</p>
    <div class="hero-meta"><span>代码服务：<code>{{.ClientBase}}</code></span><span>模拟认证服务：<code>{{.AuthBase}}</code></span><span>所有 Token 均为本地假数据</span></div>
  </header>

  <div class="layout">
    <nav class="toc" aria-label="本页目录">
      <strong>理解路径</strong>
      <a href="#lab">01 交互实验台</a>
      <a href="#principle">02 本质原理</a>
      <a href="#association">03 如何关联</a>
      <a href="#auth-object">04 Auth 对象</a>
      <a href="#scheduling">05 凭证调度</a>
      <a href="#relay">06 中转模式</a>
      <a href="#deployment">07 部署选择</a>
      <a href="#blueprint">08 实现蓝图</a>
      <a href="#faq">09 关键问答</a>
    </nav>

    <div class="content">
      <section class="section" id="lab">
        <p class="eyebrow">01 · 先动手，再理解</p>
        <h2>交互实验台</h2>
        <p class="section-intro">注意观察地址栏：浏览器会在代码服务与认证服务之间跳转。登录成功后，地址栏出现 <code>/callback?code=...&amp;state=...</code>，这就是浏览器向代码交付授权结果的瞬间。</p>
        {{if .Message}}<div class="message">{{.Message}}</div>{{end}}
        <div class="grid">
          <div class="card">
            <h3>一次完整流程</h3>
            <div class="flow">
              <div>代码生成 <strong>state + PKCE</strong> <span>verifier 只留在代码中</span></div>
              <div>浏览器跳到 <strong>模拟认证服务</strong> <span>用户登录并确认授权</span></div>
              <div>认证服务返回 302，浏览器访问 <strong>Callback</strong></div>
              <div>Callback 收到 <strong>code + state</strong>，代码后台换 Token</div>
              <div>Executor 从 Auth 取出 Token，请求 <strong>模拟 Codex</strong></div>
            </div>
            <div class="actions">
              <a class="button primary" href="/login">开始授权登录</a>
              <form class="inline" method="post" action="/call-codex"><button type="submit">调用模拟 Codex</button></form>
              <form class="inline" method="post" action="/expire"><button type="submit">令 Access Token 过期</button></form>
              <form class="inline" method="post" action="/refresh"><button type="submit">使用 Refresh Token</button></form>
              <form class="inline" method="post" action="/reset"><button class="danger" type="submit">重置演示</button></form>
            </div>
          </div>

          <div class="card">
            <h3>当前 Auth 对象</h3>
            {{if .Authenticated}}
              <p><span class="status">已认证</span></p>
              <dl>
                <dt>Auth ID</dt><dd><code>{{.AuthID}}</code></dd>
                <dt>Provider</dt><dd><code>{{.Auth.Type}}</code></dd>
                <dt>Email</dt><dd>{{.Auth.Email}}</dd>
                <dt>Account ID</dt><dd><code>{{.Auth.AccountID}}</code></dd>
                <dt>过期时间</dt><dd>{{.Auth.Expired}}</dd>
                <dt>凭证文件</dt><dd><code>{{.AuthFile}}</code></dd>
              </dl>
              <details><summary>查看本地模拟 Token</summary><dl style="margin-top:12px"><dt>Access Token</dt><dd><code>{{.Auth.AccessToken}}</code></dd><dt>Refresh Token</dt><dd><code>{{.Auth.RefreshToken}}</code></dd></dl></details>
            {{else}}
              <p><span class="status off">未认证</span></p>
              <p class="muted">当前没有 Auth。点击“开始授权登录”，观察浏览器如何把临时 code 送回代码。</p>
            {{end}}
          </div>
        </div>
        <div class="card" style="margin-top:16px">
          <h3>最近的交互事件</h3>
          {{if .Events}}{{range .Events}}<div class="event"><code>{{.At}}</code><strong>{{.Actor}}</strong><span>{{.Message}}</span></div>{{end}}{{else}}<p class="muted">还没有事件。登录后，这里会按时间倒序记录代码、浏览器、认证服务与 Executor 的交接。</p>{{end}}
        </div>
      </section>

      <section class="section" id="principle">
        <p class="eyebrow">02 · 本质原理</p>
        <h2>不是复制浏览器登录态，而是委托授权</h2>
        <p class="section-intro">这里组合了 OAuth 2.0 Authorization Code、PKCE 和 OpenID Connect。OAuth 回答“允许程序做什么”，OIDC 回答“刚才登录的是谁”。</p>
        <div class="callout"><strong>一句话：</strong>代码不读取浏览器；认证服务器登录成功后返回 HTTP 302，命令浏览器访问代码监听的 Callback，于是普通 HTTP 请求完成了跨进程交接。</div>
        <div class="chain" aria-label="登录交接链路"><span>代码生成登录申请</span><b>→</b><span>浏览器完成真人登录</span><b>→</b><span>302 到 Callback</span><b>→</b><span>代码换 Token</span><b>→</b><span>创建 Auth</span></div>
        <div class="card">
          <div class="role"><strong>用户</strong><span>拥有真实账号，在认证提供方页面完成身份验证和授权。</span></div>
          <div class="role"><strong>浏览器</strong><span>承载页面和重定向；Cookie 留在浏览器域内，不交给 Callback。</span></div>
          <div class="role"><strong>OAuth Client</strong><span>这里是 CLIProxyAPI：发起登录、监听回调、换取和保存 Token。</span></div>
          <div class="role"><strong>Auth Server</strong><span>校验用户、Client ID、Redirect URI、Scope 与 PKCE，签发 Code 和 Token。</span></div>
          <div class="role"><strong>Resource Server</strong><span>这里是 Codex API：验证 Access Token 后才提供模型能力。</span></div>
        </div>
      </section>

      <section class="section" id="association">
        <p class="eyebrow">03 · 如何关联</p>
        <h2>一次登录靠四层关系闭环</h2>
        <p class="section-intro">Callback 只是入口。真正防止串单、截获与越权的是服务端保存的登录上下文，以及认证服务器保存的授权交易。</p>
        <div class="concepts">
          <div class="concept"><strong>① state：关联“哪一次登录”</strong><p>代码保存 <code>state → verifier、tenantId、createdAt</code>。Callback 必须带回相同 state，而且只能使用一次。</p></div>
          <div class="concept"><strong>② PKCE：关联“哪个代码实例”</strong><p>授权请求只发送 challenge；秘密 verifier 留在代码里。截获 Code 的第三方无法换 Token。</p></div>
          <div class="concept"><strong>③ authorization code：关联“哪个账号授权”</strong><p>认证服务器把短期、一次性的 Code 绑定到 Client、Redirect URI、账号、Scope 与 challenge。</p></div>
          <div class="concept"><strong>④ Token：关联“后续代表谁调用”</strong><p>ID Token 描述身份；Access Token 访问 API；Refresh Token 在无需浏览器时续期。</p></div>
        </div>
        <pre>代码侧：pending[state-123] = { verifier, tenant-A, createdAt }
认证侧：code-789 = { clientId, callback, challenge, account, scope, used:false }

Callback 收到 code-789 + state-123
→ 找回 verifier 与 tenant-A
→ 用 code + verifier 换 Token
→ 保存 tenant-A → Auth(account)</pre>
        <div class="callout warn"><strong>不要混淆：</strong>OAuth 的 <code>state → 登录申请</code> 是一次性认证关联；后续调度中的 <code>sessionId → authID</code> 是对话粘连。两者发生在不同阶段，也不能互相代替。</div>
      </section>

      <section class="section" id="auth-object">
        <p class="eyebrow">04 · Auth 对象</p>
        <h2>凭证数据与调度状态的组合</h2>
        <div class="grid equal">
          <div class="card">
            <h3>认证数据：为什么能调用</h3>
            <ul class="checklist">
              <li><code>access_token</code>：短期访问 Codex，进入 Bearer Header。</li>
              <li><code>refresh_token</code>：获得新的 Access Token，敏感度最高。</li>
              <li><code>id_token</code>：OIDC 身份声明，例如账号和邮箱。</li>
              <li><code>account_id / email / expired</code>：识别账户与判断过期。</li>
            </ul>
          </div>
          <div class="card">
            <h3>运行状态：为什么能调度</h3>
            <ul class="checklist">
              <li><code>ID / Provider / Prefix</code>：本地索引与路由归属。</li>
              <li><code>Status / Disabled</code>：生命周期与人工禁用。</li>
              <li><code>Quota / ModelStates</code>：账户级与模型级可用性。</li>
              <li><code>NextRetryAfter / LastError</code>：冷却与故障恢复。</li>
            </ul>
          </div>
        </div>
        <pre>Auth 对象 ≠ 浏览器 Cookie ≠ 用户名密码

Auth 对象 = OAuth Token + 账户身份 + 调度运行状态</pre>
      </section>

      <section class="section" id="scheduling">
        <p class="eyebrow">05 · 凭证调度</p>
        <h2>调用方给输入，网关做账号决策</h2>
        <div class="chain"><span>Agent CLI</span><b>→</b><span>业务鉴权</span><b>→</b><span>Provider / Model 路由</span><b>→</b><span>Auth 候选过滤</span><b>→</b><span>Selector</span><b>→</b><span>Executor</span><b>→</b><span>Codex</span></div>
        <div class="table-wrap"><table>
          <thead><tr><th>层</th><th>应该决定什么</th><th>不应该持有什么</th></tr></thead>
          <tbody>
            <tr><td>Agent CLI / 业务代码</td><td>model、messages、tools、稳定 sessionId、网关 API Key</td><td>整个上游凭证池、其他租户的 authID</td></tr>
            <tr><td>业务授权层</td><td>调用方属于哪个 tenant，允许使用哪些 Auth 或凭证池</td><td>不应相信客户端任意声明的 authID</td></tr>
            <tr><td>Auth Manager</td><td>过滤禁用、过期、额度、冷却和不支持模型的凭证</td><td>不负责 Agent 的对话与工具循环</td></tr>
            <tr><td>Selector</td><td>Round Robin、Weighted、Fill First 或 Session Affinity</td><td>不改变业务授权边界</td></tr>
            <tr><td>Executor</td><td>协议转换、取 Token、注入 Header、调用上游</td><td>不替代租户策略</td></tr>
          </tbody>
        </table></div>
        <h3 style="margin-top:22px">一对一与一对多</h3>
        <div class="grid equal">
          <div class="card"><strong>业务一对一</strong><p><code>tenantId → authID</code>，由服务端策略决定并 Pin。适合严格账号归属。</p></div>
          <div class="card"><strong>业务一对多</strong><p><code>tenantId → allowedAuthPool</code>，Selector 只在授权池内调度。</p></div>
          <div class="card"><strong>会话粘连</strong><p><code>(provider, sessionId, model) → authID</code>，用于缓存与连续性，是可故障切换的软绑定。</p></div>
          <div class="card"><strong>普通轮询</strong><p>没有稳定 Session 时，每次请求都可能选择不同凭证，但仍受业务凭证池约束。</p></div>
        </div>
      </section>

      <section class="section" id="relay">
        <p class="eyebrow">06 · 中转模式</p>
        <h2>统一 API 背后，凭证来源可以不同</h2>
        <div class="table-wrap"><table>
          <thead><tr><th>模式</th><th>上游凭证</th><th>典型用途</th><th>主要边界</th></tr></thead>
          <tbody>
            <tr><td>官方 API 中转</td><td>平台自己的 API Key</td><td>统一协议、计费、故障切换</td><td>最适合正式商业服务</td></tr>
            <tr><td>BYOK</td><td>用户提供的 API Key</td><td>企业网关、审计、路由</td><td>网关必须保护用户 Key</td></tr>
            <tr><td>OAuth 委托代理</td><td>用户授权产生的 Token</td><td>CLI、桌面应用、连接第三方账号</td><td>必须获得 Provider OAuth 支持并遵守用途限制</td></tr>
            <tr><td>云身份</td><td>IAM、Service Account、临时令牌</td><td>云项目与企业工作负载</td><td>权限应最小化并可审计</td></tr>
            <tr><td>Cookie / 网页模拟</td><td>网页 Session、浏览器自动化</td><td>非标准兼容场景</td><td>脆弱、风控和规则风险最高，不等于 OAuth</td></tr>
          </tbody>
        </table></div>
        <p class="callout warn"><strong>CLIProxyAPI 的 Codex 路径：</strong>外部暴露统一 API，内部使用用户 OAuth Token 调用 Codex 上游。它不是把个人订阅自动转换成官方商业 API 配额。</p>
      </section>

      <section class="section" id="deployment">
        <p class="eyebrow">07 · 部署选择</p>
        <h2>不是任何 Callback 都会被认证服务器接受</h2>
        <p class="section-intro">认证服务器通常将允许的 Redirect URI 绑定到具体 Client ID。白名单在认证提供方一侧；我们自己的网络和路由配置是另一层。</p>
        <div class="grid three">
          <div class="card"><h3>本机 CLI</h3><p><code>localhost callback</code></p><p class="muted">浏览器与代码在同一台机器。Provider 必须允许该 Client ID 使用 Loopback URI。</p></div>
          <div class="card"><h3>公网服务器</h3><p><code>https://app.example.com/callback</code></p><p class="muted">需要自己的 OAuth Client、登记精确 HTTPS Redirect URI，并使回调可达。</p></div>
          <div class="card"><h3>无界面服务器</h3><p><code>Device Flow</code></p><p class="muted">服务器显示验证码，用户在另一设备授权，服务器轮询结果。</p></div>
        </div>
        <pre>认证提供方检查：client_id + redirect_uri + response_type + scope + PKCE
Token 端再次检查：code + client_id + redirect_uri + verifier + 有效期 + 是否已使用</pre>
      </section>

      <section class="section" id="blueprint">
        <p class="eyebrow">08 · 后期实现蓝图</p>
        <h2>从实验代码走向生产系统</h2>
        <div class="grid equal">
          <div class="card">
            <h3>OAuth 入口层</h3>
            <ul class="checklist">
              <li><code>POST /oauth/start</code>：创建一次性 state、PKCE 和登录上下文。</li>
              <li><code>GET /oauth/callback</code>：校验 state、TTL、一次性消费并换 Token。</li>
              <li>多实例部署时，把 Pending Login 放入共享数据库或 Redis。</li>
              <li>公网回调使用 HTTPS，严格登记 Redirect URI。</li>
            </ul>
          </div>
          <div class="card">
            <h3>凭证与业务归属</h3>
            <ul class="checklist">
              <li>保存 <code>tenantId、provider、accountId、authId</code> 的不可伪造关系。</li>
              <li>Refresh Token 加密存储；密钥与数据分离。</li>
              <li>不要用客户端传入的 email 或 authID 直接确定租户归属。</li>
              <li>支持撤销、重新授权、禁用、轮换和审计。</li>
            </ul>
          </div>
          <div class="card">
            <h3>调度与执行</h3>
            <ul class="checklist">
              <li>先得到租户允许的凭证池，再做 Round Robin 或 Session Affinity。</li>
              <li>错误反馈更新账户级和模型级冷却状态。</li>
              <li>401 可刷新后重试；429 遵循 Retry-After；设置重试上限。</li>
              <li>日志记录 authID，但永不记录完整 Token。</li>
            </ul>
          </div>
          <div class="card">
            <h3>安全与可观测性</h3>
            <ul class="checklist">
              <li>state、Code 一次性且短 TTL；Verifier 不进入浏览器和日志。</li>
              <li>验证 OIDC issuer、audience、签名、nonce 和过期时间。</li>
              <li>指标覆盖登录成功率、刷新失败、401/429、池容量和切换次数。</li>
              <li>先确认 Provider 允许的 OAuth 用途、Scope 与转售边界。</li>
            </ul>
          </div>
        </div>
        <h3 style="margin-top:22px">推荐核心数据关系</h3>
        <pre>PendingLogin { state, verifierHash, tenantId, provider, redirectUri, expiresAt, used }
Credential   { authId, tenantId, provider, accountId, encryptedTokens, expiresAt, status }
ModelState   { authId, model, unavailable, quota, retryAfter, lastError }
Affinity     { tenantId, provider, model, sessionId, authId, expiresAt }
AuditEvent   { requestId, tenantId, authId, action, result, occurredAt }</pre>
        <h3 style="margin-top:22px">CLIProxyAPI 源码阅读地图</h3>
        <div class="card">
          <div class="role"><strong>发起 Codex 登录</strong><code>source/sdk/auth/codex.go</code></div>
          <div class="role"><strong>授权 URL、换 Token、刷新</strong><code>source/internal/auth/codex/openai_auth.go</code></div>
          <div class="role"><strong>本机 Callback 服务</strong><code>source/internal/auth/codex/oauth_server.go</code></div>
          <div class="role"><strong>Auth 运行时结构</strong><code>source/sdk/cliproxy/auth/types.go</code></div>
          <div class="role"><strong>候选过滤与 Selector</strong><code>source/sdk/cliproxy/auth/selector.go</code></div>
          <div class="role"><strong>Codex Token 注入</strong><code>source/internal/runtime/executor/codex_executor_request.go</code></div>
        </div>
      </section>

      <section class="section" id="faq">
        <p class="eyebrow">09 · 关键问答</p>
        <h2>容易混淆的边界</h2>
        <div class="card">
          <details open><summary>Callback 是一个支持登录的网页吗？</summary><p>不是。它是代码实现的 HTTP 接收接口。登录发生在认证提供方；Callback 只接收 <code>code + state</code>。</p></details>
          <details><summary>Callback 自动接管了什么？</summary><p>它接管“登录完成后的授权结果”，随后代码后台换 Token。它没有接管用户密码、Cookie 或浏览器 Profile。</p></details>
          <details><summary>任何服务器都可以实现吗？</summary><p>可以实现协议框架，但 Provider 必须允许相应 Client ID、Redirect URI、Scope 与 Grant Type。写一个接口并不会自动获得权限。</p></details>
          <details><summary>为什么 localhost 能用，公网地址不能随便改？</summary><p>Loopback Callback 是 Provider 针对桌面或 CLI Client 允许的地址。公网服务器必须登记自己的精确 HTTPS Callback。</p></details>
          <details><summary>Agent CLI 决定使用哪个账号吗？</summary><p>Agent 提供 model、sessionId 和业务请求。服务端根据调用方身份确定授权池，再由 Scheduler 选择具体 Auth。</p></details>
          <details><summary>Session Affinity 就是业务一对一吗？</summary><p>不是。它只是可过期、可故障切换的会话粘连。严格租户归属必须由 <code>tenantId → allowedAuthPool</code> 实现。</p></details>
          <details><summary>这等于官方 API Key 吗？</summary><p>不等于。OAuth Token 代表用户授权身份；API Key 通常代表开发者项目或计费账户。权限、额度和使用规则都可能不同。</p></details>
        </div>
      </section>
    </div>
  </div>
</main></body></html>`))

var authorizeTemplate = template.Must(template.New("authorize").Parse(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>模拟 OpenAI 授权</title><style>` + commonCSS + `</style></head>
<body><main style="max-width:620px">
  <p class="muted">模拟认证服务器 · 浏览器当前不在业务代码服务</p>
  <section class="card">
    <h1>授权 Codex CLI 演示</h1>
    <p>这是本地模拟的 OpenAI 登录页。点击允许后，认证服务器只把一次性授权码交给浏览器。</p>
    <form method="post" action="/approve">
      <input type="hidden" name="redirect_uri" value="{{.RedirectURI}}">
      <input type="hidden" name="state" value="{{.State}}">
      <input type="hidden" name="code_challenge" value="{{.Challenge}}">
      <label for="email">模拟登录邮箱</label>
      <input id="email" name="email" type="email" value="demo@example.com" required>
      <dl style="margin-top:18px"><dt>Client ID</dt><dd><code>{{.ClientID}}</code></dd><dt>Scope</dt><dd>{{.Scope}}</dd><dt>回调地址</dt><dd><code>{{.RedirectURI}}</code></dd></dl>
      <div class="actions">
        <button class="primary" name="decision" value="approve" type="submit">登录并允许</button>
        <button name="decision" value="deny" type="submit">拒绝</button>
      </div>
    </form>
  </section>
</main></body></html>`))

var resultTemplate = template.Must(template.New("result").Parse(`<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OAuth 演示结果</title><style>` + commonCSS + `</style></head>
<body><main style="max-width:820px">
  <section class="card">
    {{if .Error}}<h1>没有完成认证</h1><div class="message error">{{.Error}}</div>{{else}}<h1>交互完成</h1><div class="message">{{.Message}}</div>{{end}}
    {{if .CallbackURL}}<h2 style="margin-top:22px">浏览器送达的回调</h2><pre>{{.CallbackURL}}</pre>{{end}}
    {{if .Code}}<p class="muted">其中 code 是一次性的；真正的 Token 由代码在后台调用 /token 换取。</p>{{end}}
    {{if .ResponseJSON}}<h2 style="margin-top:22px">代码得到的结果</h2><pre>{{.ResponseJSON}}</pre>{{end}}
    <div class="actions"><a class="button primary" href="{{.ClientBase}}/">返回代码服务首页</a></div>
  </section>
</main></body></html>`))
