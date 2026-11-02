import express, {
  type Express,
  type NextFunction,
  type Request,
  type Response,
} from "express";
import { Prisma } from "./generated/prisma/client.ts";
import { prisma } from "./lib/prisma.ts";

const app: Express = express();

app.use(express.json());

const isValidParam = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const id = req.params.id;

  const numericId = Number(id);
  // ticket.id uses PostgreSQL INTEGER (SERIAL).
  const invalidParam =
    !Number.isInteger(numericId) || numericId <= 0 || numericId > 2_147_483_647;

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
  const result = await prisma.ticket.findMany({
    orderBy: {
      id: "asc",
    },
  });
  res.status(200).json(result);
});

app.get("/tickets/:id", isValidParam, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await prisma.ticket.findUnique({
    where: {
      id: Number(id),
    },
  });

  const statusCode = result ? 200 : 404;

  res.status(statusCode).json({
    message: result ? "Ok" : "Ticket not found!",
    data: result ?? null,
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

  if (titleLength < 10 || titleLength > 60) {
    return res.status(400).json({
      message: "Title must be between 10 and 60 characters",
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

  const result = await prisma.ticket.create({
    data: {
      title: title.trim(),
      description,
    },
  });

  res.status(201).json({
    message: "Ticket created successfully",
    data: result,
  });
});

app.delete(
  "/tickets/:id",
  isValidParam,
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      await prisma.ticket.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: "Ticket deleted successfully!",
        data: null,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Ticket not found!",
          data: null,
        });
      }

      return next(error);
    }
  },
);

app.patch(
  "/tickets/:id",
  isValidParam,
  isValidBody,
  async (req: Request, res: Response, next: NextFunction) => {
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

      if (titleLength < 10 || titleLength > 60) {
        return res.status(400).json({
          message: "Title must be between 10 and 60 characters",
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

    const data: { title?: string; description?: string } = {};

    if ("title" in body) {
      data.title = body.title.trim();
    }

    if ("description" in body) {
      data.description = body.description;
    }

    try {
      const updatedTicket = await prisma.ticket.update({
        data,
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: "Ticket updated successfully!",
        data: updatedTicket,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "Ticket not found!",
          data: null,
        });
      }

      return next(error);
    }
  },
);

type AppError = Error & {
  type?: string;
  status?: number;
  code?: string;
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

  if (err.code === "23514" || err.code === "22001") {
    return res.status(400).json({
      message: "Validation failed",
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
