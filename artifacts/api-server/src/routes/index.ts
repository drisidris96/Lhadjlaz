import { Router, type IRouter } from "express";
import healthRouter from "./health";
import productsRouter from "./products";
import ordersRouter from "./orders";
import adminRouter from "./admin";
import storageRouter from "./storage";
import dhdRouter from "./dhd";

const router: IRouter = Router();

router.use(healthRouter);
router.use(productsRouter);
router.use(ordersRouter);
router.use(adminRouter);
router.use(storageRouter);
router.use(dhdRouter);

export default router;
