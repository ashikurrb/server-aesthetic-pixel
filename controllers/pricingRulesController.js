import pricingRulesModel from "../model/PricingRulesModel.js";
import productModel from "../model/productModel.js";

export const createPricingRulesController = async (req, res) => {
    try {
        const {
            defaultPhotoCount,
            extraPhotoPrice,
            discountRules = [],
            maxQtyPerOrder,
        } = req.body;

        const existingRules = await pricingRulesModel.findOne();
        if (existingRules) {
            return res.status(400).send({
                success: false,
                message: "Pricing rules already exist. Please update instead.",
            });
        }

        if (defaultPhotoCount == null || extraPhotoPrice == null) {
            return res.status(400).send({
                success: false,
                message: "defaultPhotoCount and extraPhotoPrice are required",
            });
        }

        for (const rule of discountRules) {
            if (
                rule.minQty == null ||
                rule.maxQty == null ||
                rule.discountPercentage == null
            ) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid discount rule structure",
                });
            }

            if (rule.minQty > rule.maxQty) {
                return res.status(400).send({
                    success: false,
                    message: "minQty cannot be greater than maxQty",
                });
            }
        }

        const pricingRules = await pricingRulesModel.create({
            defaultPhotoCount,
            extraPhotoPrice,
            discountRules,
            maxQtyPerOrder,
            createdBy: req.user?._id,
        });

        return res.status(201).send({
            success: true,
            message: "Pricing rules created successfully",
            pricingRules,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).send({
            success: false,
            message: "Error in creating pricing rules",
            error,
        });
    }
};


//update pricing rules controller
export const updatePricingRulesController = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            defaultPhotoCount,
            extraPhotoPrice,
            discountRules = [],
            maxQtyPerOrder,
        } = req.body;

        if (defaultPhotoCount == null || extraPhotoPrice == null) {
            return res.status(400).send({
                success: false,
                message: "defaultPhotoCount and extraPhotoPrice are required",
            });
        }

        for (const rule of discountRules) {
            if (
                rule.minQty == null ||
                rule.maxQty == null ||
                rule.discountPercentage == null
            ) {
                return res.status(400).send({
                    success: false,
                    message: "Invalid discount rule structure",
                });
            }

            if (rule.minQty > rule.maxQty) {
                return res.status(400).send({
                    success: false,
                    message: "minQty cannot be greater than maxQty",
                });
            }
        }
        const pricingRules = await pricingRulesModel.findByIdAndUpdate(
            id,
            {
                defaultPhotoCount,
                extraPhotoPrice,
                discountRules,
                maxQtyPerOrder,
                updatedBy: req.user?._id,
            },
            { new: true }
        );
        res.status(200).send({
            success: true,
            message: "Pricing rules updated successfully",
            pricingRules,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error in updating pricing rules",
        })
    };
};

//get pricing rules controller
export const getPricingRulesController = async (req, res) => {
    try {
        const pricingRules = await pricingRulesModel.findOne();
        res.status(200).send({
            success: true,
            message: "Pricing rules fetched successfully",
            pricingRules,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Error in fetching pricing rules",
        });
    }
};

//get unified pricing rules  controller
export const getUnifiedPricingRulesController = async (req, res) => {
  try {
    // Fetch all active products
    const products = await productModel
      .find({ active: true })
      .select("name basePrice -_id")
      .lean();

    // Fetch the latest pricing rule
    const pricing = await pricingRulesModel
      .findOne()
      .sort({ createdAt: -1 })
      .lean();

    if (!pricing) {
      return res.status(404).json({
        success: false,
        message: "No pricing rules found in the database",
      });
    }

    const productPricing = {
      categories: products.map((p) => ({
        name: p.name,
        basePrice: p.basePrice,
      })),
      pricingRules: {
        maxDefaultPhotos: pricing.defaultPhotoCount,
        extraPhotoPrice: pricing.extraPhotoPrice,
        discounts: pricing.discountRules.map((d) => ({
          minQuantity: d.minQty,
          maxQuantity: d.maxQty,
          discountPercent: d.discountPercentage,
        })),
        maxQuantity: pricing.maxQtyPerOrder,
        customQuoteMessage: "Contact for custom quote",
      },
    };

    res.status(200).json({ success: true, data: productPricing });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      success: false,
      message: "Error in fetching Pricing Data",
    });
  }
};
