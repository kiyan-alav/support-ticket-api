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

app.post("/echo", async (req: Request, res: Response) => {
  const data = req.body;

  res.status(200).json(data);
});

app.listen(5000);
