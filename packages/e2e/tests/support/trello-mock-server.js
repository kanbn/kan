import { createServer } from "node:http";

const port = process.env.TRELLO_MOCK_PORT ?? "4025";

const board = {
  id: "mock-board-1",
  name: "Mock Trello Board",
  labels: [
    { id: "label-1", name: "Bug", color: "red_dark" },
    { id: "label-2", name: "Feature", color: "blue_light" },
  ],
  lists: [
    { id: "list-1", name: "To Do" },
    { id: "list-2", name: "Done" },
  ],
  cards: [
    {
      id: "card-1",
      name: "Fix login bug",
      desc: "Users can't log in",
      idList: "list-1",
      labels: [{ id: "label-1", name: "Bug", color: "red_dark" }],
    },
    {
      id: "card-2",
      name: "Add dark mode",
      desc: "",
      idList: "list-2",
      labels: [{ id: "label-2", name: "Feature", color: "blue_light" }],
    },
  ],
  checklists: [
    {
      id: "checklist-1",
      idCard: "card-1",
      name: "Steps",
      checkItems: [
        { id: "item-1", name: "Reproduce issue", state: "complete", pos: 1 },
        { id: "item-2", name: "Write fix", state: "incomplete", pos: 2 },
      ],
    },
  ],
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  res.setHeader("Content-Type", "application/json");

  if (url.pathname === "/health") {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (url.pathname === "/members/me/boards") {
    res.writeHead(200);
    res.end(JSON.stringify([{ id: board.id, name: board.name }]));
    return;
  }

  if (url.pathname === `/boards/${board.id}`) {
    if (url.searchParams.get("labels_limit") !== "1000") {
      res.writeHead(400);
      res.end(JSON.stringify({ message: "labels_limit must be 1000" }));
      return;
    }

    res.writeHead(200);
    res.end(JSON.stringify(board));
    return;
  }

  res.writeHead(404);
  res.end(JSON.stringify({ message: "Not found" }));
});

server.listen(Number(port), () => {
  console.log(`Trello mock server listening on :${port}`);
});
