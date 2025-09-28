import React, { useEffect, useState } from "react";

// 单文件 React 作品集（Tailwind）
// 用法：把此组件作为默认 App 导出，或直接放在 index.jsx 中。
// 功能：
//  - 简洁大气的 UI
//  - 本地（localStorage）保存项目
//  - 支持把单个项目文件上传到 GitHub 仓库（需要用户在页面输入个人访问令牌 PAT）
//  - 如果不想用 PAT，会把项目保存在本地，可导出下载

export default function PortfolioApp() {
  const [projects, setProjects] = useState([]);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState(null);

  // GitHub 上传配置（用户输入）
  const [ghOwner, setGhOwner] = useState("luotun");
  const [ghRepo, setGhRepo] = useState("luotun.github.io");
  const [ghToken, setGhToken] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const raw = localStorage.getItem("lt_projects_v1");
    if (raw) setProjects(JSON.parse(raw));
  }, []);

  useEffect(() => {
    localStorage.setItem("lt_projects_v1", JSON.stringify(projects));
  }, [projects]);

  function resetForm() {
    setTitle("");
    setDesc("");
    setFile(null);
    document.getElementById("file-input")?.setAttribute("value", "");
  }

  async function addProject(e) {
    e.preventDefault();
    if (!title) return alert("请填写标题");

    let fileData = null;
    let filename = "";
    if (file) {
      filename = file.name;
      fileData = await readFileAsDataURL(file);
    }

    const p = {
      id: Date.now().toString(),
      title,
      desc,
      filename,
      fileData,
      createdAt: new Date().toISOString(),
    };

    setProjects([p, ...projects]);
    resetForm();
    setStatus("已在本地保存项目（localStorage）。若想发布到 GitHub，请使用下面的“上传到 GitHub”按钮。");
  }

  function readFileAsDataURL(f) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(f);
    });
  }

  function downloadFile(project) {
    if (!project.fileData) return alert("此项目没有文件可下载");
    const a = document.createElement("a");
    a.href = project.fileData;
    a.download = project.filename || `${project.title}`;
    a.click();
  }

  async function uploadProjectToGitHub(project) {
    if (!ghToken) return alert("请先在页面顶部输入你的 GitHub Personal Access Token (PAT)");

    setStatus("开始上传到 GitHub...");
    try {
      // 我们把文件放到仓库的 _projects/ 目录，文件名用 id + 原名
      const path = `_projects/${project.id}_${project.filename || project.title}.data`;

      // 准备 base64 内容（从 dataURL 中剥离头部）
      const content = project.fileData
        ? project.fileData.split(",")[1]
        : btoa(unescape(encodeURIComponent(JSON.stringify({ title: project.title, desc: project.desc }))));

      // 检查文件是否已存在（需要 sha 来更新）
      const urlGet = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${encodeURIComponent(path)}`;
      let sha = null;
      const getRes = await fetch(urlGet, {
        headers: { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json" },
      });
      if (getRes.status === 200) {
        const getJson = await getRes.json();
        sha = getJson.sha;
      }

      const urlPut = `https://api.github.com/repos/${ghOwner}/${ghRepo}/contents/${encodeURIComponent(path)}`;
      const body = {
        message: `Add project ${project.title} (${project.id}) via portfolio site`,
        content: content,
        branch: "main",
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(urlPut, {
        method: "PUT",
        headers: { Authorization: `token ${ghToken}`, Accept: "application/vnd.github.v3+json" },
        body: JSON.stringify(body),
      });

      const putJson = await putRes.json();
      if (putRes.ok) {
        setStatus(`上传成功：${putJson.content.path}`);
      } else {
        console.error(putJson);
        setStatus(`上传失败：${putJson.message || JSON.stringify(putJson)}`);
      }
    } catch (err) {
      console.error(err);
      setStatus(`上传出错：${err.message}`);
    }
  }

  function removeProject(id) {
    if (!confirm("确认删除此项目吗？（仅从本地）")) return;
    setProjects(projects.filter((p) => p.id !== id));
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white p-8 font-sans">
      <header className="max-w-5xl mx-auto mb-8">
        <h1 className="text-4xl font-extrabold mb-2">luotun 的作品集 · Project Hub</h1>
        <p className="text-slate-600">简洁、大气、可上传 —— 本页面可保存到本地（localStorage），也可选择将单个项目文件上传到你的 GitHub 仓库 <code>luotun.github.io</code> 的 <code>_projects/</code> 目录。</p>

        <div className="mt-4 p-4 bg-white rounded-2xl shadow-sm grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-700">GitHub 用户/组织</label>
            <input value={ghOwner} onChange={(e) => setGhOwner(e.target.value)} className="mt-1 block w-full rounded-md border p-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">仓库名</label>
            <input value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} className="mt-1 block w-full rounded-md border p-2" />
          </div>

          <div className="md:col-span-3">
            <label className="block text-sm font-medium text-slate-700">GitHub Personal Access Token (用于上传，必要时填写)</label>
            <input value={ghToken} onChange={(e) => setGhToken(e.target.value)} placeholder="github_pat_xxx (仅在需要上传时填写)" className="mt-1 block w-full rounded-md border p-2" />
            <p className="text-xs text-rose-600 mt-1">注意：为安全起见，请不要在公共场合贴出你的 PAT。上传时 PAT 需包含 repo 权限，上传行为会将文件写入仓库。若不填写，系统只会把项目保存在本地。</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto">
        <section className="mb-6">
          <form onSubmit={addProject} className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-3">新增项目</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700">标题</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 block w-full rounded-md border p-2" />

                <label className="block text-sm font-medium text-slate-700 mt-3">简介</label>
                <textarea value={desc} onChange={(e) => setDesc(e.target.value)} className="mt-1 block w-full rounded-md border p-2" rows={4} />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">上传文件（可选）</label>
                <input id="file-input" type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} className="mt-1 block w-full" />

                <div className="mt-4 flex flex-col gap-2">
                  <button type="submit" className="px-4 py-2 rounded-xl bg-slate-900 text-white">保存到本地</button>
                </div>
              </div>
            </div>
          </form>
        </section>

        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-medium">项目列表</h3>
            <div className="text-sm text-slate-600">共 {projects.length} 个</div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-4 shadow-sm flex flex-col">
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{p.title}</h4>
                  <p className="text-sm text-slate-600 mt-2">{p.desc}</p>
                </div>

                <div className="mt-4 flex gap-2">
                  {p.fileData ? (
                    <button onClick={() => downloadFile(p)} className="px-3 py-1 rounded-lg border">下载</button>
                  ) : (
                    <button disabled className="px-3 py-1 rounded-lg border text-slate-400">无文件</button>
                  )}

                  <button onClick={() => uploadProjectToGitHub(p)} className="px-3 py-1 rounded-lg border">上传到 GitHub</button>
                  <button onClick={() => removeProject(p.id)} className="ml-auto px-3 py-1 rounded-lg border text-rose-600">删除</button>
                </div>

                <div className="mt-2 text-xs text-slate-400">{new Date(p.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>

          {projects.length === 0 && (
            <div className="mt-6 text-center text-slate-500">暂无项目，快添加第一个吧！</div>
          )}
        </section>

        <div className="mt-6 p-4 text-sm text-slate-700 bg-white rounded-2xl shadow-sm">
          <h4 className="font-medium">说明 / 部署指导（简要）</h4>
          <ol className="list-decimal pl-5 mt-2">
            <li>将本组件放入你的 React 项目（或直接用 Vite / Create React App）并构建静态站点。</li>
            <li>在 GitHub 上创建仓库 <code>luotun.github.io</code>（仓库名必须是 <code>用户名.github.io</code>），并将构建后的静态文件 push 到仓库的 main 分支。</li>
            <li>GitHub 会自动为 <code>luotun.github.io</code> 提供 Pages 服务，域名即 <code>https://luotun.github.io</code>。</li>
            <li>若想使用页面的“上传到 GitHub”功能，请为你的 PAT 打开 <code>repo</code> 权限（仅在私人环境下使用）。上传会把文件写入仓库的 <code>_projects/</code> 目录。</li>
          </ol>

          <p className="mt-2 text-rose-600">安全提示：在公共设备或公开页面不要填写或暴露你的 PAT。若不填写 PAT，所有操作仅保存在本地。</p>
        </div>

        <div className="mt-6 text-sm text-slate-500">{status}</div>
      </main>

      <footer className="max-w-5xl mx-auto mt-12 text-center text-xs text-slate-500"> 内建上传（需 PAT 可选） · 生成于本地</footer>
    </div>
  );
}
