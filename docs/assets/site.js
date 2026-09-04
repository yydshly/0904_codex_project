const statusLabels = {
  queued: "待研究",
  researching: "研究中",
  published: "已发布",
  archived: "已归档"
};

const list = document.querySelector("#project-list");
const count = document.querySelector("#project-count");
const template = document.querySelector("#project-template");
const repositoryBase = "https://github.com/yydshly/0904_codex_project/tree/main";

const showEmptyState = (message = "第一个项目正在路上") => {
  list.innerHTML = `
    <div class="empty-state">
      <strong>${message}</strong>
      <p>收录项目后，这里会按照研究顺序展示摘要、原仓库与 Demo 入口。</p>
    </div>
  `;
};

try {
  const response = await fetch("projects.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const projects = await response.json();
  count.textContent = `${projects.length} 个项目`;

  if (!projects.length) {
    showEmptyState();
  } else {
    for (const project of projects) {
      const fragment = template.content.cloneNode(true);
      const directory = `${String(project.order).padStart(3, "0")}-${project.slug}`;
      const cover = fragment.querySelector(".cover");
      const demo = fragment.querySelector(".demo-link");

      cover.src = project.cover;
      cover.alt = `${project.name} 项目封面`;
      fragment.querySelector(".order").textContent = String(project.order).padStart(3, "0");
      fragment.querySelector(".status").textContent = statusLabels[project.status] ?? project.status;
      fragment.querySelector(".tags").textContent = project.tags.join(" · ");
      fragment.querySelector("h3").textContent = project.name;
      fragment.querySelector(".summary").textContent = project.summary;
      fragment.querySelector(".report-link").href = `${repositoryBase}/projects/${directory}`;
      fragment.querySelector(".repository-link").href = project.repository;

      if (project.demo) demo.href = project.demo;
      else demo.hidden = true;

      list.append(fragment);
    }
  }
} catch (error) {
  console.error(error);
  count.textContent = "读取失败";
  showEmptyState("暂时无法读取项目索引");
}
