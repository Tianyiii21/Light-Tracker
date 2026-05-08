import { Router, type IRouter } from "express";
import healthRouter from "./health";
import poetryRouter from "./poetry";

const router: IRouter = Router();

router.use(healthRouter);
router.use(poetryRouter);

export default router;
