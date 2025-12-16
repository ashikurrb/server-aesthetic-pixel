import categoryModel from '../model/categoryModel.js';
import subCategoryModel from '../model/subCategoryModel.js';
import dotenv from 'dotenv';
import slugify from 'slugify';

//declare dotenv
dotenv.config();

//create subcategory controller
export const createSubCategoryController = async (req, res) => {
    try {
        const { name, description, parentCategory } = req.fields;

        //validation
        if (!name) {
            return res.status(400).send({
                success: false,
                message: "Name is required.",
            });
        }

        if (!description) {
            return res.status(400).send({
                success: false,
                message: "Description is required.",
            });
        }

        if (!parentCategory) {
            return res.status(400).send({
                success: false,
                message: "Parent Category is required.",
            });
        }

        //Category Name must be unique globally
        const categoryWithSameName = await categoryModel.findOne({ name });
        if (categoryWithSameName) {
            return res.status(409).send({
                success: false,
                message: "Category already exists",
            });
        }

        //SubCategory Name must be unique globally
        const subCategoryWithSameName = await subCategoryModel.findOne({ name });
        if (subCategoryWithSameName) {
            return res.status(409).send({
                success: false,
                message: "Sub-category already exist"
            });
        }

        // Ensure parent category exists
        const parent = await categoryModel.findById(parentCategory);
        if (!parent) {
            return res.status(404).send({
                success: false,
                message: "Parent Category not found.",
            });
        }

        // Create Subcategory
        const createdBy = req.user?._id;

        const subCategory = await subCategoryModel.create({
            name,
            slug: slugify(name),
            description,
            parentCategory,
            createdBy,
        });

        res.status(201).send({
            success: true,
            message: "Sub-category created successfully!",
            subCategory,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "SubCategory Creation Error",
            error: error.message,
        });
    }
};

//get all sub categories controller
export const getAllSubCategoriesController = async (req, res) => {
    try {
        const subCategories = await subCategoryModel.find({}).populate('parentCategory').sort({ createdAt: -1 });
        res.status(200).send({
            success: true,
            message: "Sub-categories fetched successfully",
            subCategories,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Sub-categories fetching error",
            error: error.message,
        });
    }
};

// Get all subcategories grouped by parent
export const getSubCategoriesByParentController = async (req, res) => {
    try {
        const data = await subCategoryModel.aggregate([
            {
                $lookup: {
                    from: "categories",
                    localField: "parentCategory",
                    foreignField: "_id",
                    as: "parent",
                }
            },
            { $unwind: "$parent" },

            {
                $group: {
                    _id: "$parent._id",

                    // return full parent category details
                    parentDetails: { $first: "$parent" },

                    // return all subcategories
                    subCategories: {
                        $push: {
                            _id: "$_id",
                            name: "$name",
                            slug: "$slug",
                            parentCategory: "$parentCategory",
                            createdAt: "$createdAt",
                            updatedAt: "$updatedAt"
                        }
                    }
                }
            },

            { $sort: { "parentDetails.name": 1 } }
        ]);

        res.status(200).send({
            success: true,
            grouped: data
        });

    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Failed to load grouped subcategories",
            error: error.message,
        });
    }
};

//update sub category controller
export const updateSubCategoryController = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, slug, description, parentCategory } = req.fields;

        //validation
        if (!name) {
            return res.status(400).send({
                success: false,
                message: "Name is required.",
            });
        }

        if (!description) {
            return res.status(400).send({
                success: false,
                message: "Description is required.",
            });
        }

        if (!parentCategory) {
            return res.status(400).send({
                success: false,
                message: "Parent Category is required.",
            });
        }

        //check name in Category
        const exisitingCategory = await categoryModel.findOne({ name: name });
        if (exisitingCategory && exisitingCategory._id.toString() !== id) {
            return res.status(409).send({
                success: false,
                message: "Category already exist"
            });
        }

        // Check name in SubCategory
        const exisitingSubCategory = await subCategoryModel.findOne({ name: name });
        if (exisitingSubCategory && exisitingSubCategory._id.toString() !== id) {
            return res.status(409).send({
                success: false,
                message: "Sub-Category already exist"
            });
        }

        // // Check slug in Category
        // const categoryWithSameSlug = await categoryModel.findOne({ slug });
        // if (categoryWithSameSlug && categoryWithSameSlug._id.toString() !== id) {
        //     return res.status(409).send({
        //         success: false,
        //         message: "Slug already exist in categories",
        //     });
        // }

        // // Check slug in SubCategory
        // const subCategoryWithSameSlug = await subCategoryModel.findOne({ slug });
        // if (subCategoryWithSameSlug) {
        //     return res.status(409).send({
        //         success: false,
        //         message: "Slug already exist in sub-categories",
        //     });
        // }

        const updatedBy = req.user?._id;
        const subCategory = await subCategoryModel.findByIdAndUpdate(
            id,
            { name, slug, description, parentCategory, updatedBy },
            { new: true }
        );
        res.status(200).send({
            success: true,
            message: "Subcategory updated successfully",
            subCategory,
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Failed to update subcategory",
            error: error.message,
        });
    }
};

//delete single sub category controller
export const deleteSubCategoryController = async (req, res) => {
    try {
        const { id } = req.params;
        await subCategoryModel.findByIdAndDelete(id);
        res.status(200).send({
            success: true,
            message: "Subcategory deleted successfully",
        });
    } catch (error) {
        res.status(500).send({
            success: false,
            message: "Failed to delete subcategory",
            error: error.message,
        });
    }
};