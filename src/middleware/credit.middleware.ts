import { UserModel } from "../models/user.model";

const MAX_DAILY_CREDITS = 100;

export const deductCredits = (cost: number) => {
  return async (req: any, res: any, next: any) => {
    const userId = req.auth.userId;

    const user = await UserModel.findOne({ clerk_user_id: userId });

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    const now = new Date();
    const lastReset = user.last_credit_reset || new Date(0);

    const hoursSinceReset =
      (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);

    // 🔄 Reset after 24 hours
    if (hoursSinceReset >= 24) {
      user.credits = MAX_DAILY_CREDITS;
      user.last_credit_reset = now;
    }

    if (user.credits < cost) {
      return res.status(403).json({
        message: "Insufficient credits. Please upgrade your plan.",
      });
    }

    user.credits -= cost;
    await user.save();

    next();
  };
};