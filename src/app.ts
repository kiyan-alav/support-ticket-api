import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";

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

const isValidParam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const id = req.params.id;

  const numericId = Number(id);
  const invalidParam = !Number.isInteger(numericId) || numericId <= 0;

  if (invalidParam) {
    return res.status(400).json({
      message: "Invalid param",
      data: null,
    });
  }

  return next();
};

const isValidBody = async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;

  const invalidBody =
    body === null || typeof body !== "object" || Array.isArray(body);

  if (invalidBody) {
    return res.status(400).json({
      message: "Invalid body",
      data: null,
    });
  }

  return next();
};

app.get("/health", async (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

app.get("/tickets", async (req: Request, res: Response) => {
  let data = mock;

  res.status(200).json(data);
});

app.get("/tickets/:id", isValidParam, async (req: Request, res: Response) => {
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

app.post("/tickets", isValidBody, async (req: Request, res: Response) => {
  const { title, description } = req.body;

  if (typeof title !== "string" || typeof description !== "string") {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  if (!title.trim() || !description.trim()) {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  const titleLength = title.trim().length;

  if (titleLength < 10 || titleLength > 50) {
    return res.status(400).json({
      message: "Title must be between 10 and 50 characters",
      data: null,
    });
  }

  const descriptionLength = description.trim().length;

  if (descriptionLength < 10 || descriptionLength > 2000) {
    return res.status(400).json({
      message: "Description must be between 10 and 2000 characters",
      data: null,
    });
  }

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

app.delete(
  "/tickets/:id",
  isValidParam,
  async (req: Request, res: Response) => {
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
      data: null,
    });
  },
);

app.patch(
  "/tickets/:id",
  isValidParam,
  isValidBody,
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const body = req.body;

    if ("title" in body) {
      if (typeof body.title !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const titleLength = body.title.trim().length;

      if (titleLength < 10 || titleLength > 50) {
        return res.status(400).json({
          message: "Title must be between 10 and 50 characters",
          data: null,
        });
      }
    }

    if ("description" in body) {
      if (typeof body.description !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const descriptionLength = body.description.trim().length;

      if (descriptionLength < 10 || descriptionLength > 2000) {
        return res.status(400).json({
          message: "Description must be between 10 and 2000 characters",
          data: null,
        });
      }
    }

    const foundTicket = mock.find((item) => item.id === +id);

    if (foundTicket && "title" in body) {
      foundTicket.title = body.title;
    }

    if (foundTicket && "description" in body) {
      foundTicket.description = body.description;
    }

    const statusCode = foundTicket ? 200 : 404;

    res.status(statusCode).json({
      message: foundTicket
        ? "Ticket updated successfully!"
        : "Ticket not found!",
      data: foundTicket ?? null,
    });
  },
);

type AppError = Error & {
  type?: string;
  status?: number;
};

app.use((err: AppError, req: Request, res: Response, next: NextFunction) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON",
      data: null,
    });
  }

  if (err.status === 413) {
    return res.status(413).json({
      message: "Request size is too long",
      data: null,
    });
  }

  const statusCode = err.status;

  if (
    typeof statusCode === "number" &&
    Number.isInteger(statusCode) &&
    statusCode >= 400 &&
    statusCode <= 499
  ) {
    return res.status(statusCode).json({
      message: "Invalid request",
      data: null,
    });
  }

  return res.status(500).json({
    message: "Internal Server Error",
    data: null,
  });
});

app.listen(5000);
