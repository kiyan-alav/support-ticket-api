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

app.get("/users", async (req: Request, res: Response) => {
  const users = await prisma.user.findMany({
    include: {
      tickets: true,
    },
    orderBy: {
      id: "desc",
    },
  });

  return res.status(200).json(users);
});

app.get("/users/:id", isValidParam, async (req: Request, res: Response) => {
  const { id } = req.params;

  const user = await prisma.user.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      tickets: true,
    },
  });

  const statusCode = user ? 200 : 404;

  return res.status(statusCode).json({
    message: user ? "Ok" : "User not found!",
    data: user ?? null,
  });
});

app.post("/users", isValidBody, async (req: Request, res: Response) => {
  const { firstName, lastName } = req.body;

  if (typeof firstName !== "string" || typeof lastName !== "string") {
    return res.status(400).json({
      message: "Validation failed",
      data: null,
    });
  }

  if (!firstName.trim() || !lastName.trim()) {
    return res.status(400).json({
      message: "First name or Last name could not be empty!",
      data: null,
    });
  }

  const firstNameLength = firstName.trim().length;

  if (firstNameLength > 50) {
    return res.status(400).json({
      message: "FirstName must be between 1 and 50 characters",
      data: null,
    });
  }

  const lastNameLength = lastName.trim().length;

  if (lastNameLength > 50) {
    return res.status(400).json({
      message: "LastName must be between 1 and 50 characters",
      data: null,
    });
  }

  const user = await prisma.user.create({
    data: {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    },
  });

  return res.status(201).json({
    message: "New user created!",
    data: user,
  });
});

app.patch(
  "/users/:id",
  isValidParam,
  isValidBody,
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;
    const body = req.body;

    if ("firstName" in body) {
      if (typeof body.firstName !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const firstNameLength = body.firstName.trim().length;

      if (firstNameLength < 1 || firstNameLength > 50) {
        return res.status(400).json({
          message: "FirstName must be between 1 and 50 characters",
          data: null,
        });
      }
    }

    if ("lastName" in body) {
      if (typeof body.lastName !== "string") {
        return res.status(400).json({
          message: "Validation failed",
          data: null,
        });
      }

      const lastNameLength = body.lastName.trim().length;

      if (lastNameLength < 1 || lastNameLength > 50) {
        return res.status(400).json({
          message: "LastName must be between 1 and 50 characters",
          data: null,
        });
      }
    }

    const data: { firstName?: string; lastName?: string } = {};

    if ("firstName" in body) {
      data.firstName = body.firstName.trim();
    }

    if ("lastName" in body) {
      data.lastName = body.lastName.trim();
    }

    try {
      const updatedUser = await prisma.user.update({
        data,
        where: {
          id: Number(id),
        },
        include: {
          tickets: true,
        },
      });

      return res.status(200).json({
        message: "User updated successfully!",
        data: updatedUser,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "User not found!",
          data: null,
        });
      }

      return next(error);
    }
  },
);

app.delete(
  "/users/:id",
  isValidParam,
  async (req: Request, res: Response, next: NextFunction) => {
    const { id } = req.params;

    try {
      await prisma.user.delete({
        where: {
          id: Number(id),
        },
      });

      return res.status(200).json({
        message: "User deleted successfully!",
        data: null,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2025"
      ) {
        return res.status(404).json({
          message: "User not found!",
          data: null,
        });
      }

      return next(error);
    }
  },
);

app.get("/health", async (req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
  });
});

type SortValue = "asc" | "desc";
app.get("/tickets", async (req: Request, res: Response) => {
  const { userId, sort, page, pageSize } = req.query;
  const where: { userId?: number } = {};
  const orderBy: { id: SortValue } = { id: "asc" };
  let numericPage = 1;
  let numericPageSize = 10;

  if ("userId" in req.query) {
    if (typeof userId !== "string") {
      return res.status(400).json({
        message: "Invalid UserId",
        data: null,
      });
    }

    const numericUserId = Number(userId);
    const invalidUserId =
      !Number.isInteger(numericUserId) ||
      numericUserId <= 0 ||
      numericUserId > 2_147_483_647;

    if (invalidUserId) {
      return res.status(400).json({
        message: "Invalid UserId",
        data: null,
      });
    }

    where.userId = numericUserId;
  }

  if ("sort" in req.query) {
    if (typeof sort !== "string") {
      return res.status(400).json({
        message: "Invalid Sort",
        data: null,
      });
    }

    if (sort !== "asc" && sort !== "desc") {
      return res.status(400).json({
        message: "Invalid Sort Value",
        data: null,
      });
    }

    orderBy.id = sort;
  }

  if ("page" in req.query) {
    if (typeof page !== "string") {
      return res.status(400).json({
        message: "Invalid Page",
        data: null,
      });
    }

    numericPage = Number(page);

    if (!Number.isSafeInteger(numericPage) || numericPage < 1) {
      return res.status(400).json({
        message: "Invalid Page",
        data: null,
      });
    }
  }

  if ("pageSize" in req.query) {
    if (typeof pageSize !== "string") {
      return res.status(400).json({
        message: "Invalid PageSize",
        data: null,
      });
    }

    numericPageSize = Number(pageSize);

    if (
      !Number.isInteger(numericPageSize) ||
      numericPageSize < 1 ||
      numericPageSize > 100
    ) {
      return res.status(400).json({
        message: "PageSize must be between 1 and 100",
        data: null,
      });
    }
  }

  const take = numericPageSize;
  const skip = (numericPage - 1) * numericPageSize;

  if (!Number.isSafeInteger(skip) || skip > 2_147_483_647) {
    return res.status(400).json({
      message: "Page is too large",
      data: null,
    });
  }

  const result = await prisma.ticket.findMany({
    orderBy,
    where,
    take,
    skip,
    include: {
      user: true,
    },
  });
  return res.status(200).json(result);
});

app.get("/tickets/:id", isValidParam, async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await prisma.ticket.findUnique({
    where: {
      id: Number(id),
    },
    include: {
      user: true,
    },
  });

  const statusCode = result ? 200 : 404;

  return res.status(statusCode).json({
    message: result ? "Ok" : "Ticket not found!",
    data: result ?? null,
  });
});

app.get(
  "/tickets/:id/comments",
  isValidParam,
  async (req: Request, res: Response) => {
    const ticket = await prisma.ticket.findUnique({
      where: { id: Number(req.params.id) },
      select: {
        comments: {
          orderBy: { id: "asc" },
          include: {
            author: {
              select: { id: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });

    if (!ticket) {
      return res.status(404).json({
        message: "Ticket not found!",
        data: null,
      });
    }

    return res.status(200).json(ticket.comments);
  },
);

app.post(
  "/tickets/:id/comments",
  isValidParam,
  isValidBody,
  async (req: Request, res: Response, next: NextFunction) => {
    const { text, authorId } = req.body;

    if (typeof text !== "string" || typeof authorId !== "number") {
      return res.status(400).json({
        message: "Validation failed",
        data: null,
      });
    }

    const trimmedText = text.trim();

    if (trimmedText.length < 1 || trimmedText.length > 150) {
      return res.status(400).json({
        message: "Text must be between 1 and 150 characters",
        data: null,
      });
    }

    if (
      !Number.isInteger(authorId) ||
      authorId <= 0 ||
      authorId > 2_147_483_647
    ) {
      return res.status(400).json({
        message: "Invalid AuthorId",
        data: null,
      });
    }

    try {
      const comment = await prisma.comment.create({
        data: {
          text: trimmedText,
          authorId,
          ticketId: Number(req.params.id),
        },
      });

      return res.status(201).json({
        message: "Comment created successfully",
        data: comment,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return res.status(404).json({
          message: "Ticket or author not found!",
          data: null,
        });
      }

      return next(error);
    }
  },
);

app.post(
  "/tickets",
  isValidBody,
  async (req: Request, res: Response, next: NextFunction) => {
    const { title, description, userId } = req.body;

    if ("userId" in req.body) {
      const invalidUserId =
        !Number.isInteger(userId) || userId <= 0 || userId > 2_147_483_647;

      if (invalidUserId) {
        return res.status(400).json({
          message: "Invalid UserId",
          data: null,
        });
      }
    }

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

    try {
      const result = await prisma.ticket.create({
        data: {
          title: title.trim(),
          description,
          userId,
        },
        include: {
          user: true,
        },
      });

      return res.status(201).json({
        message: "Ticket created successfully",
        data: result,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2003"
      ) {
        return res.status(404).json({
          message: "User not found!",
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
        include: {
          user: true,
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
