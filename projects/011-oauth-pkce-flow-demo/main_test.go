package main

import "testing"

func TestPKCEChallengeStable(t *testing.T) {
	const verifier = "test-verifier"
	first := pkceChallenge(verifier)
	second := pkceChallenge(verifier)
	if first == "" || first != second {
		t.Fatalf("challenge must be non-empty and stable: %q vs %q", first, second)
	}
	if first == pkceChallenge("different-verifier") {
		t.Fatal("different verifiers must not produce the same challenge")
	}
}

func TestCloneAuth(t *testing.T) {
	original := &storedAuth{Type: "codex", AccessToken: "at_demo"}
	cloned := cloneAuth(original)
	if cloned == original || cloned.AccessToken != original.AccessToken {
		t.Fatal("cloneAuth must return an independent copy")
	}
}
