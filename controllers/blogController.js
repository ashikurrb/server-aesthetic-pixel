import blogModel from "../model/blogModel.js";
import slugify from 'slugify';
import { deleteFromS3 } from '../config/deleteFromS3.js';

export const createBlogController = async (req, res) => {
    try {
        const { title, slug, category, subCategory, jsonContent, excerpt, metaDescription, status, publishedAt } = req.body;

        // Get coverPhoto from S3 + CloudFront
        let coverPhotoUrl = null;

        if (req.file) {
            const fileKey = req.file.key;

            // CloudFront URL
            coverPhotoUrl = `https://${process.env.CLOUDFRONT_DOMAIN}/${fileKey}`;
        }

        const newBlog = await new blogModel({
            title,
            slug: slugify(title),
            category,
            subCategory,
            coverPhoto: coverPhotoUrl,
            jsonContent,
            excerpt,
            metaDescription,
            status,
            publishedAt,
            createdBy: req.user._id,
        }).save();

        res.status(201).json({
            success: true,
            message: "Blog created successfully",
            newBlog,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error creating blog",
            error: error.message,
        });
    }
};

//get published blogs controller
export const getAllBlogsController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const blogs = await blogModel.find({})
            .select("-jsonContent")
            .populate("createdBy", "name email")
            .populate("category", "name")
            .populate("subCategory", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalBlogs = await blogModel.countDocuments({});

        //send response
        res.status(200).json({
            success: true,
            message: "Blogs fetched successfully",
            blogs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                totalBlogs,
                hasNextPage: page * limit < totalBlogs,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching blogs",
            error: error.message,
        });
    }
};

//get published blogs controller
export const getPublishedBlogsController = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 9;
        const skip = (page - 1) * limit;

        const blogs = await blogModel.find({status: 'Published'})
            .select("-jsonContent")
            .populate("createdBy", "name email")
            .populate("category", "name")
            .populate("subCategory", "name")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const totalBlogs = await blogModel.countDocuments({status: 'Published'});

        //send response
        res.status(200).json({
            success: true,
            message: "Blogs fetched successfully",
            blogs,
            pagination: {
                currentPage: page,
                totalPages: Math.ceil(totalBlogs / limit),
                totalBlogs,
                hasNextPage: page * limit < totalBlogs,
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({
            success: false,
            message: "Error fetching blogs",
            error: error.message,
        });
    }
};

//delete blog
export const deleteBlogController = async (req, res) => {
    try {
        const { id } = req.params;
        const blog = await blogModel.findById(id);

        // Delete coverPhoto from S3 if exists
        if (blog.coverPhoto) {
            // cloudfront
            const fileKey = blog.coverPhoto.replace(
                `https://${process.env.CLOUDFRONT_DOMAIN}/`,
                ""
            );
            await deleteFromS3(fileKey);
        };

        await blogModel.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Blog deleted successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error deleting blog",
        });
    }
};

//single blog fetch controller
export const getSingleBlogController = async (req, res) => {
    try {
        const { slug } = req.params;

        const blogPost = await blogModel
            .findOne({ slug })
            .populate("createdBy", "name email")
            .populate("category", "name")
            .populate("subCategory", "name");

        if (!blogPost) {
            return res.status(404).json({
                success: false,
                message: "Blog not found",
            });
        }

        res.status(200).json({
            success: true,
            message: "Blog fetched successfully",
            blogPost,
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching blog",
        });
    }
};