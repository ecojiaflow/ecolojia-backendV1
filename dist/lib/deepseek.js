"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
async function calculate(product) {
    console.log("🤖 Appel DeepSeek simulé pour :", product.title);
    return {
        eco_score: Math.random(), // test aléatoire
        ai_confidence: 0.85
    };
}
async function getSimilar(product) {
    console.log("🧠 Suggestions IA simulées pour :", product.title);
    return [
        {
            id: "sim-001",
            title: "Savon solide karité",
            slug: "savon-solide-karite",
            image_url: null,
            eco_score: 0.81
        },
        {
            id: "sim-002",
            title: "Shampoing solide bio",
            slug: "shampoing-solide-bio",
            image_url: null,
            eco_score: 0.74
        }
    ];
}
exports.default = {
    calculate,
    getSimilar
};
