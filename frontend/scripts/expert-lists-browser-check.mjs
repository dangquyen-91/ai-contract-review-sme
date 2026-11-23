// Real Chrome + real components; isolated API fixtures, no live accounts or DB.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import postcss from "postcss";
import tailwind from "@tailwindcss/postcss";

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL("../", import.meta.url));
const dir = await fs.mkdtemp(
  path.join(os.tmpdir(), "lawscan-expert-lists-ui-"),
);
const entry = path.join(dir, "entry.tsx"),
  loader = path.join(dir, "loader.cjs");
await fs.writeFile(
  loader,
  `const ts=require(${JSON.stringify(require.resolve("typescript"))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`,
);

const link = path.join(dir, "link.js"),
  navigation = path.join(dir, "navigation.js");
await fs.writeFile(
  link,
  "import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}",
);
await fs.writeFile(
  navigation,
  "export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({replace:url=>{history.replaceState(null,'',url);window.dispatchEvent(new PopStateEvent('popstate'));}});",
);
await fs.writeFile(
  entry,
  `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {NuqsAdapter} from 'nuqs/adapters/react';
import {VerificationQueue} from '@/components/expert-verification/verification-queue';
import {VerificationMyWork} from '@/components/expert-verification/verification-my-work';
import {VerificationHistory} from '@/components/expert-verification/verification-history';
const history=Array.from({length:25},(_,i)=>{
  const action=i>=20?'confirm':['confirm','adjust','reject','add','remove'][i%5];
  const before={title:'Thời hạn thanh toán '+(i+1),checkGroup:'clarity',problem:['Chưa xác định thời hạn.'],consequences:[],recommendations:['Làm rõ thời hạn.']};
  const after=action==='adjust'?{...before,title:'Điều chỉnh thời hạn thanh toán '+(i+1),problem:['Cần xác định số ngày thanh toán.']}:before;
  return {_id:'h'+String(i+1).padStart(2,'0'),action,attempt:i>=20?1:2,createdAt:'2026-11-23T12:00:'+String(i).padStart(2,'0')+'Z',expertId:i===24?null:{_id:'expert',name:i===16?'ChuyênGia'.repeat(35):'Chuyên gia Minh Anh'},reason:['adjust','reject'].includes(action)?'Cần làm rõ nghĩa vụ thanh toán và thời hạn giao hàng.':'',before:action==='add'||i===24?undefined:before,after:action==='remove'||i===24?undefined:after};
}).reverse();
function HistoryFixture(){
  const [items,setItems]=useState(history);
  window.emptyHistory=()=>setItems([]);
  window.restoreHistory=()=>setItems(history);
  return <VerificationHistory history={items}/>;
}
const Page=location.pathname.endsWith('/my-work')?VerificationMyWork:location.pathname==='/expert-history-fixture'?HistoryFixture:VerificationQueue;
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><NuqsAdapter><main><Page /></main></NuqsAdapter></QueryClientProvider>);
`,
);
const { webpack } = require("next/dist/compiled/webpack/webpack");
await new Promise((resolve, reject) =>
  webpack(
    {
      mode: "development",
      devtool: false,
      entry,
      output: { path: dir, filename: "app.js" },
      resolve: {
        extensions: [".tsx", ".ts", ".js"],
        alias: { "@": root, "next/link": link, "next/navigation": navigation },
        modules: [path.join(root, "node_modules"), "node_modules"],
      },
      module: {
        rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }],
      },
    },
    (error, stats) =>
      error || stats.hasErrors()
        ? reject(
            error || new Error(stats.toString({ all: false, errors: true })),
          )
        : resolve(),
  ),
);
const stylesheet = path.join(root, "styles/globals.css");
const css = (
  await postcss([tailwind({ base: root })]).process(
    await fs.readFile(stylesheet, "utf8"),
    { from: stylesheet },
  )
).css;
const bundle = await fs.readFile(path.join(dir, "app.js"));
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>body{margin:0;background:#f6f7f9;font-family:Arial}main{padding:24px;max-width:1600px;margin:auto}@media(min-width:1024px){main{margin-left:240px}}</style><div id="root"></div><script src="/app.js"></script></html>`;

let fail = false;
const queue = Array.from({ length: 27 }, (_, i) => ({
  _id: String(i + 1),
  reviewId: String(i + 1).padStart(24, "0"),
  contractId: {
    _id: "c" + i,
    title:
      (i % 3 === 0 ? "Hợp đồng lao động " : "Hợp đồng mua bán hàng hóa ") +
      (i + 1),
    type: i % 3 === 0 ? "labor" : "sales",
  },
  status: i < 19 ? "requested" : "in_progress",
  requestedBy: {
    _id: "p" + i,
    name: i % 2 ? "Nguyễn Tấn Phúc" : "Nguyễn Minh Anh",
  },
  requestedAt: "2026-11-" + String(i + 1).padStart(2, "0") + "T12:15:00Z",
  attempt: 1,
  requestNote:
    i % 2
      ? "Vui lòng kiểm tra điều khoản thanh toán và thời hạn giao hàng."
      : "",
}));
const work = Array.from({ length: 33 }, (_, i) => ({
  expertReviewId: "w" + (i + 1),
  reviewId: String(i + 1).padStart(24, "0"),
  contractId: "c" + i,
  title:
    i === 2
      ? "Hợp đồng bảo trì hệ thống và hỗ trợ kỹ thuật trong nhiều giai đoạn thực hiện"
      : queue[i % 27].contractId.title,
  contractType: queue[i % 27].contractId.type,
  requestedBy: queue[i % 27].requestedBy,
  status: ["in_progress", "approved", "returned"][i % 3],
  attempt: i % 3 === 0 ? 1 : 2,
  historical: i % 3 !== 0,
  available: i !== 32,
  assignedAt: "2026-11-" + String((i % 27) + 1).padStart(2, "0") + "T12:15:00Z",
  completedAt: i % 3 === 0 ? undefined : "2026-11-28T11:15:00Z",
  decisionPreview:
    i % 3 === 2
      ? "Cần bổ sung điều khoản thanh toán và làm rõ trách nhiệm nghiệm thu."
      : "Đã đối chiếu các nội dung và hoàn tất xác minh.",
}));
const workRequests = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, "http://fixture");
  const send = (data, code = 200) => {
    res.writeHead(code, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify(
        code === 200
          ? { success: true, data }
          : {
              success: false,
              error: { message: "Không thể tải danh sách công việc." },
            },
      ),
    );
  };
  if (url.pathname === "/app.js") {
    res.setHeader("Content-Type", "text/javascript");
    return res.end(bundle);
  }
  if (url.pathname === "/api/reviews/verification-queue") {
    if (fail) return send(null, 503);
    const status = url.searchParams.get("status");
    return send(queue.filter((i) => status === "all" || i.status === status));
  }
  if (url.pathname === "/api/reviews/my-verifications") {
    workRequests.push(Object.fromEntries(url.searchParams));
    if (fail) return send(null, 503);
    const p = url.searchParams;
    const page = Number(p.get("page") || 1),
      limit = Number(p.get("limit") || 10);
    const rows = work.filter(
      (i) =>
        (p.get("status") === "all" || i.status === p.get("status")) &&
        (!p.get("search") ||
          i.title.toLowerCase().includes(p.get("search").toLowerCase())) &&
        (!p.get("type") || i.contractType === p.get("type")) &&
        (!p.get("from") || i.assignedAt.slice(0, 10) >= p.get("from")) &&
        (!p.get("to") || i.assignedAt.slice(0, 10) <= p.get("to")),
    );
    return send({
      items: rows.slice((page - 1) * limit, page * limit),
      total: rows.length,
      page,
      limit,
      pages: Math.max(1, Math.ceil(rows.length / limit)),
    });
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.end(html);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(
  process.env.CHROME_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--no-first-run",
    "--remote-debugging-port=0",
    `--user-data-dir=${path.join(dir, "profile")}`,
    "about:blank",
  ],
  { windowsHide: true, stdio: "ignore" },
);
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try {
      port = (
        await fs.readFile(path.join(dir, "profile/DevToolsActivePort"), "utf8")
      ).split("\n")[0];
      break;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  assert.ok(port, "Chrome did not start");
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(
    pages.find((page) => page.type === "page").webSocketDebuggerUrl,
  );
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    const task = pending.get(message.id);
    if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  };
  const call = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++sequence,
        timer = setTimeout(
          () => reject(new Error(`Timeout: ${method}`)),
          15000,
        );
      pending.set(id, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      socket.send(JSON.stringify({ id, method, params }));
    });
  const evaluate = async (expression) => {
    const result = await call("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) throw new Error(result.result.description);
    return result.result.value;
  };
  const wait = async (expression) => {
    for (let i = 0; i < 100; i++) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`UI wait failed: ${expression}`);
  };
  const click = async (label) => {
    const target = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`;
    await wait(`Boolean(${target})`);
    await evaluate(`(${target}).click()`);
  };

  const rows = 'document.querySelectorAll("[data-verification-row]")';
  const first = rows + "[0]?.dataset.verificationRow";
  const group = async (label) =>
    evaluate(
      `[...document.querySelectorAll('button[aria-pressed]')].find(b=>b.textContent.startsWith(${JSON.stringify(label)})).click()`,
    );
  const fillInput = async (selector, value) =>
    evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
  const choose = async (selector, value) =>
    evaluate(
      `(()=>{const e=document.querySelector(${JSON.stringify(selector)});e.value=${JSON.stringify(value)};e.dispatchEvent(new Event('change',{bubbles:true}));})()`,
    );
  const byLabel = async (label) => {
    await wait(
      `!!document.querySelector('button[aria-label="${label}"]:not(:disabled)')`,
    );
    await evaluate(
      `document.querySelector('button[aria-label="${label}"]').click()`,
    );
  };
  const snapshot = async (name) =>
    fs.writeFile(
      path.join(dir, name + ".png"),
      Buffer.from(
        (await call("Page.captureScreenshot", { format: "png" })).data,
        "base64",
      ),
    );
  await call("Page.enable");
  await call("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false,
  });
  await call("Page.navigate", { url: origin + "/expert-verification" });
  await wait(rows + ".length===10");
  assert.equal(await evaluate(first), "1");
  assert.equal(
    await evaluate(
      `document.querySelector('[aria-label="Trang trước"]').disabled`,
    ),
    true,
  );
  await byLabel("Trang sau");
  await wait(first + '==="11"');
  assert.ok(await evaluate('location.search.includes("queuePage=2")'));
  await byLabel("Trang 3");
  await wait(rows + ".length===7");
  assert.equal(await evaluate(first), "21");
  await wait('location.search.includes("queuePage=3")');
  await call("Page.reload");
  await wait(first + '==="21"');
  await evaluate("history.back()");
  await wait(first + '==="11"');
  await fillInput("input", "lao dong");
  await click("Tìm kiếm");
  await wait(rows + ".length===9");
  assert.equal(
    await evaluate('document.querySelector("[aria-current=page]").textContent'),
    "1",
  );
  await click("Xóa bộ lọc");
  await wait(rows + ".length===10");
  await byLabel("Trang 3");
  await wait(first + '==="21"');
  await group("Chờ tiếp nhận");
  await wait(first + '==="1"');
  assert.equal(
    await evaluate('document.querySelector("[aria-current=page]").textContent'),
    "1",
  );
  await group("Tôi đang xử lý");
  await wait(rows + ".length===8");
  await group("Tất cả");
  await wait(rows + ".length===10");
  await choose('select[aria-label="Loại hợp đồng trong hàng đợi"]', "labor");
  await wait(rows + ".length===9");
  await click("Xóa bộ lọc");
  await wait(rows + ".length===10");
  await snapshot("queue-desktop");
  await call("Page.navigate", {
    url: origin + "/expert-verification?queuePage=999",
  });
  await wait(first + '==="21"&&location.search.includes("queuePage=3")');
  const removed = queue.splice(11);
  await click("Làm mới");
  await wait(rows + '.length===1&&location.search.includes("queuePage=2")');
  queue.push(...removed);
  await call("Page.navigate", { url: origin + "/expert-verification/my-work" });
  await wait(rows + ".length===10");
  await byLabel("Trang sau");
  await wait(rows + ".length===1");
  assert.ok(await evaluate('location.search.includes("page=2")'));
  assert.equal(workRequests.at(-1).page, "2");
  assert.equal(workRequests.at(-1).limit, "10");
  await group("Tất cả");
  await wait(rows + ".length===10");
  await wait('document.querySelector("[aria-current=page]").textContent==="1"');
  await byLabel("Trang 4");
  await wait(rows + ".length===3");
  assert.equal(
    await evaluate(
      `document.querySelector('[aria-label="Trang sau"]').disabled`,
    ),
    true,
  );
  await group("Đã trả lại");
  await wait(rows + ".length===10");
  await wait('document.querySelector("[aria-current=page]").textContent==="1"');
  await evaluate('document.querySelector("details").open=true');
  assert.ok(
    await evaluate(
      'document.querySelector("details").textContent.includes("Cần bổ sung")',
    ),
  );
  assert.ok(
    await evaluate(
      '[...document.querySelectorAll("[data-verification-row] a")].some(a=>a.href.includes("attempt=2"))',
    ),
  );
  await byLabel("Trang sau");
  await wait(rows + ".length===1");
  assert.ok(
    await evaluate(
      'document.body.textContent.includes("Hợp đồng không còn khả dụng")',
    ),
  );
  await fillInput("input[type=date]", "2026-11-30");
  // The dates have separate labels, so select the second date explicitly.
  await fillInput("label:last-child input[type=date]", "2026-11-01");
  const beforeInvalid = workRequests.length;
  await click("Áp dụng bộ lọc");
  await wait(
    'document.body.textContent.includes("Ngày kết thúc cần bằng hoặc sau ngày bắt đầu.")',
  );
  assert.equal(workRequests.length, beforeInvalid);
  await click("Xóa bộ lọc");
  await wait(rows + ".length===10");
  await fillInput("input[type=text]", "khong-ton-tai");
  await click("Áp dụng bộ lọc");
  await wait('document.body.textContent.includes("Chưa có công việc phù hợp")');
  await click("Xóa bộ lọc");
  await wait(rows + ".length===10");
  fail = true;
  await click("Làm mới");
  await wait('!!document.querySelector("[role=alert]")');
  assert.equal(await evaluate(rows + ".length"), 10);
  fail = false;
  await click("Thử lại");
  await wait('!document.querySelector("[role=alert]")');
  await group("Đã hoàn tất");
  await wait('document.body.textContent.includes("Kết luận")');
  await group("Tất cả");
  await wait(rows + ".length===10");
  await snapshot("my-work-desktop");
  await call("Page.navigate", {
    url: origin + "/expert-verification/my-work?status=all&page=999",
  });
  await wait(rows + '.length===3&&location.search.includes("page=4")');
  await byLabel("Trang 1");
  await wait(rows + ".length===10");
  for (const width of [1280, 768, 390]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await new Promise((r) => setTimeout(r, 450));
    assert.equal(
      await evaluate("document.documentElement.scrollWidth<=innerWidth"),
      true,
      "overflow at " + width,
    );
    assert.equal(
      await evaluate(
        `[...document.querySelectorAll('[data-verification-row] a')].filter(e=>e.getBoundingClientRect().width>0).every(e=>{const r=e.getBoundingClientRect();const p=e.closest('td').getBoundingClientRect();return r.left>=p.left&&r.right<=p.right+1})`,
      ),
      true,
      "actions fit at " + width,
    );
    await snapshot("my-work-" + width);
  }
  await byLabel("Trang sau");
  await wait(first + '==="w11:2"');
  assert.ok(
    await evaluate(
      `document.querySelector('nav[aria-label="Phân trang công việc"]').textContent.includes('Trang 2/4')`,
    ),
  );
  await call("Page.navigate", { url: origin + "/expert-verification" });
  await wait(rows + ".length===10");
  assert.equal(
    await evaluate("document.documentElement.scrollWidth<=innerWidth"),
    true,
  );
  await snapshot("queue-mobile");
  await call("Page.navigate", { url: origin + "/expert-history-fixture" });
  await wait('!!document.querySelector("summary")');
  await evaluate('document.querySelector("summary").click()');
  const historyRows = 'document.querySelectorAll("ol[aria-label] > li")';
  await wait(historyRows + ".length===10");
  assert.ok(
    await evaluate(
      'document.querySelector("ol li").textContent.includes("19:00:24")',
    ),
  );
  assert.ok(
    await evaluate(
      'document.querySelector("ol li").textContent.includes("Lần xác minh 1")',
    ),
  );
  assert.equal(
    await evaluate(
      'document.querySelector("ol li").textContent.includes("Chuyên gia")',
    ),
    true,
  );
  assert.equal(
    await evaluate(
      'document.body.textContent.includes("snapshot")||document.body.textContent.includes("rủi ro")',
    ),
    false,
  );
  await click("Xem thêm 10 thao tác");
  await wait(historyRows + ".length===20");
  await click("Xem thêm 5 thao tác");
  await wait(historyRows + ".length===25");
  assert.equal(
    await evaluate('getComputedStyle(document.querySelector("ol")).overflowY'),
    "visible",
  );
  await choose("select", "adjust");
  await wait(historyRows + ".length===4");
  await evaluate(
    '(()=>{const e=document.querySelectorAll("select")[1];e.value="1";e.dispatchEvent(new Event("change",{bubbles:true}));})()',
  );
  await wait(
    'document.body.textContent.includes("Không có thao tác phù hợp.")',
  );
  await click("Xóa bộ lọc");
  await wait(historyRows + ".length===10");
  await evaluate(
    '(()=>{const e=document.querySelectorAll("select")[1];e.value="1";e.dispatchEvent(new Event("change",{bubbles:true}));})()',
  );
  await wait(historyRows + ".length===5");
  await click("Xóa bộ lọc");
  await wait(historyRows + ".length===10");
  await choose("select", "adjust");
  await wait(historyRows + ".length===4");
  await evaluate('document.querySelector("ol details > summary").click()');
  await wait('document.querySelector("ol details").open');
  assert.ok(
    await evaluate(
      'document.querySelector("ol details").textContent.includes("Trước")&&document.querySelector("ol details").textContent.includes("Sau")',
    ),
  );
  for (const width of [1440, 768, 390]) {
    await call("Emulation.setDeviceMetricsOverride", {
      width,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });
    await new Promise((resolve) => setTimeout(resolve, 350));
    await evaluate("window.scrollTo(0,0)");
    assert.equal(
      await evaluate("document.documentElement.scrollWidth<=innerWidth"),
      true,
      "history overflow at " + width,
    );
    assert.equal(
      await evaluate(
        '[...document.querySelectorAll("article")].every(a=>a.scrollWidth<=a.clientWidth+1)',
      ),
      true,
      "history card overflow at " + width,
    );
    await snapshot("history-" + width);
  }
  await choose("select", "add");
  await wait(
    'document.querySelector("ol li").textContent.includes("Bổ sung vấn đề")',
  );
  await evaluate('document.querySelector("ol details > summary").click()');
  assert.equal(
    await evaluate(
      'document.querySelector("ol details").textContent.includes("Trước")',
    ),
    false,
  );
  await choose("select", "remove");
  await wait(
    'document.querySelector("ol li").textContent.includes("Xóa vấn đề bổ sung")',
  );
  await evaluate('document.querySelector("ol details > summary").click()');
  assert.equal(
    await evaluate(
      'document.querySelector("ol details").textContent.includes("Sau")',
    ),
    false,
  );
  await evaluate("window.emptyHistory()");
  await wait(
    'document.body.textContent.includes("Chưa có thao tác xác minh.")',
  );
  await evaluate("window.restoreHistory()");
  await wait(historyRows + ".length===4");
  console.log(
    "PASS: queue and server-work pagination, filters, archived links, errors; history timeline, action/attempt filters, show more, comparisons, empty state; desktop/tablet/mobile",
  );
  console.log("Screenshots: " + dir);
} finally {
  socket?.close();
  chrome.kill();
  await new Promise((resolve) => server.close(resolve));
}
