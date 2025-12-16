import BlogModel from "../model/blogModel.js";
import slugify from 'slugify';

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

        const newBlog = await new BlogModel({
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
            blog: newBlog,
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: "Error creating blog",
            error: error.message,
        });
    }
};