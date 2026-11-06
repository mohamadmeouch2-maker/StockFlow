import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { reviewsApi } from "../api/reviews";
import { RatingBadge } from "./RatingBadge";
import { ReviewForm } from "./ReviewForm";

const mine = vi.spyOn(reviewsApi, "mine");
const save = vi.spyOn(reviewsApi, "save").mockResolvedValue({} as never);
beforeEach(() => save.mockClear());

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReviewForm productId={3} />
    </QueryClientProvider>,
  );

test("the rating badge shows the average out of 10, or that there are no ratings", () => {
  const { rerender } = render(<RatingBadge rating={{ average: null, count: 0 }} />);
  expect(screen.getByText("No ratings yet")).toBeInTheDocument();
  rerender(<RatingBadge rating={{ average: 8.5, count: 12 }} />);
  expect(screen.getByText("(12 ratings)")).toBeInTheDocument();
  expect(screen.getByTitle("Rated 8.5 out of 10 by 12 customers")).toHaveTextContent("★ 8.5/10");
});

test("a customer who hasn't bought the product can't rate it", async () => {
  mine.mockResolvedValue({ canReview: false, review: null });
  renderForm();
  expect(await screen.findByText("You can rate this product after you buy it.")).toBeInTheDocument();
});

test("a buyer picks a score from 1 to 10, writes a comment and submits", async () => {
  mine.mockResolvedValue({ canReview: true, review: null });
  renderForm();
  const submit = await screen.findByRole("button", { name: "Submit review" });
  expect(submit).toBeDisabled(); // no score picked yet
  await userEvent.click(screen.getByRole("radio", { name: "9 out of 10" }));
  await userEvent.type(screen.getByLabelText("Comment (optional)"), "Very good");
  await userEvent.click(submit);
  await vi.waitFor(() => expect(save).toHaveBeenCalledWith(3, { rating: 9, comment: "Very good" }));
});

test("a customer who already rated sees their review and can update it", async () => {
  mine.mockResolvedValue({ canReview: true, review: { rating: 6, comment: "Okay" } });
  renderForm();
  expect(await screen.findByRole("button", { name: "Update review" })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: "6 out of 10" })).toHaveAttribute("aria-checked", "true");
  expect(screen.getByLabelText("Comment (optional)")).toHaveValue("Okay");
});
