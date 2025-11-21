// src/controllers/articlePushController.ts
import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

interface Hotel {
    id?: string;
    name: string;
    image: string;
    highlight: string;
    description: string;
    price?: string;
    rating?: number;
    location?: string;
    tags?: string[];
    isRefundable?: boolean;
}

interface Article {
    city: string;
    title: string;
    slug: string;
    excerpt: string;
    intro?: string;
    hotels: Hotel[];
    generatedAt: string;
}

export const pushArticleController = async (req: Request, res: Response) => {
    try {
        const { article } = req.body as { article: Article };

        // Validate required fields
        if (!article || !article.city || !article.title || !article.slug) {
            return res.status(400).json({
                error: 'Invalid article data',
                message: 'Required fields: city, title, slug'
            });
        }

        console.log(`📥 Receiving article: ${article.title}`);

        // Save to generated-articles directory in your backend
        const articlesDir = path.join(process.cwd(), 'generated-articles', article.city);

        // Create directory if it doesn't exist
        if (!fs.existsSync(articlesDir)) {
            fs.mkdirSync(articlesDir, { recursive: true });
        }

        const filepath = path.join(articlesDir, `${article.slug}.json`);
        fs.writeFileSync(filepath, JSON.stringify(article, null, 2), 'utf8');

        console.log(`✅ Article saved: ${filepath}`);

        return res.status(200).json({
            success: true,
            message: 'Article received and saved',
            article: {
                city: article.city,
                slug: article.slug,
                title: article.title,
                hotelCount: article.hotels.length,
                filepath: filepath
            }
        });

    } catch (error) {
        console.error('Error saving article:', error);
        return res.status(500).json({
            error: 'Failed to save article',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};