import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { categoriesApi } from "../../api/categories";
import { ApiError } from "../../api/client";
import { CategoriesPage } from "./CategoriesPage";

vi.spyOn(categoriesApi, "list").mockResolvedValue([
  { id: 1, name: "Cleaning", productCount: 0 },
  { id: 2, name: "Office", productCount: 2 },
]);
const create = vi.spyOn(categoriesApi, "create");
const rename = vi.spyOn(categoriesApi, "rename");
beforeEach(() => {
  create.mockReset();
  rename.mockReset();
});

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <CategoriesPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
const row = async (name: string) => (await screen.findByText(name)).closest("tr")!;

test("lists the categories with their product counts; one with products can't be deleted (FR-11)", async () => {
  renderPage();
  const office = await row("Office");
  expect(office).toHaveTextContent("2 products");
  expect(within(office).getByRole("button", { name: "Delete" })).toBeDisabled();
  expect(within(await row("Cleaning")).getByRole("button", { name: "Delete" })).toBeEnabled();
});

test("adds a category, and shows the server's message when the name is taken", async () => {
  create.mockRejectedValueOnce(new ApiError(409, "CATEGORY_EXISTS", "Already exists", [{ field: "name", message: '"Office" already exists' }]));
  renderPage();
  const input = await screen.findByLabelText("New category name");
  await userEvent.type(input, "office");
  await userEvent.click(screen.getByRole("button", { name: "+ Add category" }));
  expect(await screen.findByText('"Office" already exists')).toBeInTheDocument();

  create.mockResolvedValueOnce({ id: 3, name: "Kitchen" });
  await userEvent.clear(input);
  await userEvent.type(input, "Kitchen");
  await userEvent.click(screen.getByRole("button", { name: "+ Add category" }));
  expect(create).toHaveBeenLastCalledWith("Kitchen");
});

test("renames a category in its row", async () => {
  rename.mockResolvedValue({ id: 2, name: "Office supplies" });
  renderPage();
  await userEvent.click(within(await row("Office")).getByRole("button", { name: "Rename" }));
  const input = screen.getByLabelText("New name for Office");
  await userEvent.clear(input);
  await userEvent.type(input, "Office supplies");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(rename).toHaveBeenCalledWith(2, "Office supplies");
});
