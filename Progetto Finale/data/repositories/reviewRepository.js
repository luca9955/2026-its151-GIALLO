import { getReviews, saveReviews } from "../storage.js";

export function listReviews() {
  return getReviews().sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function createReview({ customerName, stars, comment }) {
  const review = {
    id: `REV-${Date.now().toString(36).toUpperCase()}`,
    customerName: customerName.trim(),
    stars: Number(stars),
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };
  saveReviews([review, ...getReviews()]);
  return review;
}

export function removeReview(id) {
  saveReviews(getReviews().filter((review) => review.id !== id));
}
