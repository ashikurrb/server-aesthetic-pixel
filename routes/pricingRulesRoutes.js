import express from 'express';
import formidable from 'express-formidable';
import { requireSignIn, isAdmin, isModerator, isActive } from '../middlewares/authMiddleware.js';
import { createPricingRulesController, getPricingRulesController, getUnifiedPricingRulesController, updatePricingRulesController } from '../controllers/pricingRulesController.js';

//declare router
const router = express.Router();

//Create Pricing Rules Route
router.post("/create-pricing-rules", requireSignIn, isActive, isAdmin, createPricingRulesController);

//update Pricing Rules
router.put("/update-pricing-rules/:id", requireSignIn, isActive, isAdmin, updatePricingRulesController);

//Pricing Rules fetch
router.get("/get-pricing-rules", requireSignIn, isActive, isModerator, getPricingRulesController);

//unified pricing rules for calculation
router.get("/get-unified-pricing-rules", getUnifiedPricingRulesController);

export default router;