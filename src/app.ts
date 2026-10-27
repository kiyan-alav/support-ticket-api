import express, { type Express, type Request, type Response } from "express";

const app: Express = express();

app.get("/health", (req: Request, res: Response) => {
  res.json({
    status: "ok",
  });
});

app.listen(5000);
