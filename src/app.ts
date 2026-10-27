import express, { type Express, type Request, type Response } from "express";

const app: Express = express();

app.use(express.json());

const mock = [
  {
    id: 1,
    title: "مشکل در ورود به حساب کاربری",
    description:
      "هنگام ورود به حساب کاربری با خطای نامعتبر بودن اطلاعات مواجه می‌شوم.",
    status: "OPEN",
    createdAt: "2026-10-20T09:30:00.000Z",
  },
  {
    id: 2,
    title: "عدم نمایش اطلاعات پروفایل",
    description:
      "پس از بروزرسانی اطلاعات حساب، تغییرات جدید در صفحه پروفایل نمایش داده نمی‌شوند.",
    status: "OPEN",
    createdAt: "2026-10-21T14:15:00.000Z",
  },
  {
    id: 3,
    title: "درخواست افزودن قابلیت اعلان‌ها",
    description:
      "لطفاً امکان دریافت اعلان هنگام پاسخگویی به تیکت‌ها را اضافه کنید.",
    status: "OPEN",
    createdAt: "2026-10-23T11:45:00.000Z",
  },
  {
    id: 4,
    title: "خطا در بارگذاری فایل پیوست",
    description:
      "هنگام آپلود فایل PDF در بخش پشتیبانی، عملیات با خطای سرور متوقف می‌شود.",
    status: "OPEN",
    createdAt: "2026-10-25T16:20:00.000Z",
  },
];

let nextTicketId = Math.max(0, ...mock.map((ticket) => ticket.id)) + 1;

app.get("/health", async (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/tickets", async (req: Request, res: Response) => {
  let data = mock;

  res.status(200).json(data);
});

app.get("/tickets/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  console.log(req.params);
  console.log(req.query);

  const foundTicket = mock.find((item) => item.id === +id);

  const statusCode = foundTicket ? 200 : 404;

  res.status(statusCode).json({
    message: foundTicket ? "Ok" : "Ticket not found!",
    data: foundTicket ?? null,
  });
});

app.post("/tickets", async (req: Request, res: Response) => {
  const data = {
    title: req.body.title,
    description: req.body.description,
    id: nextTicketId,
    status: "OPEN",
    createdAt: new Date().toString(),
  };

  mock.push(data);
  nextTicketId += 1;

  res.status(201).json({
    message: "Ticket created successfully",
    data,
  });
});

app.delete("/tickets/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const foundTicketIndex = mock.findIndex((item) => item.id === +id);

  const statusCode = foundTicketIndex !== -1 ? 200 : 404;

  if (foundTicketIndex !== -1) {
    mock.splice(foundTicketIndex, 1);
  }

  res.status(statusCode).json({
    message:
      foundTicketIndex !== -1
        ? "Ticket deleted successfully!"
        : "Ticket not found!",
  });
});

app.patch("/tickets/:id", async (req: Request, res: Response) => {
  const { id } = req.params;

  const foundTicket = mock.find((item) => item.id === +id);

  if (foundTicket && "title" in req.body) {
    foundTicket.title = req.body.title;
  }

  if (foundTicket && "description" in req.body) {
    foundTicket.description = req.body.description;
  }

  const statusCode = foundTicket ? 200 : 404;

  res.status(statusCode).json({
    message: foundTicket ? "Ticket updated successfully!" : "Ticket not found!",
    data: foundTicket ?? null,
  });
});

app.listen(5000);
