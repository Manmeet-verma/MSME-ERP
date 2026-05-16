import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import clientsRouter from "./clients";
import productsRouter from "./products";
import addonsRouter from "./addons";
import quotationsRouter from "./quotations";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(clientsRouter);
router.use(productsRouter);
router.use(addonsRouter);
router.use(quotationsRouter);
router.use(reportsRouter);

export default router;
