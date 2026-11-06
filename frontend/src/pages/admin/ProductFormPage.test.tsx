import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, test, vi } from "vitest";
import { productsApi } from "../../api/products";
import { ProductFormPage } from "./ProductFormPage";

// Guide 5.3: the API calls are replaced by fakes, so no backend is needed.
vi.spyOn(productsApi, "categories").mockResolvedValue([{ id: 1, name: "Office" }]);
const create = vi.spyOn(productsApi, "create").mockResolvedValue({ id: 7 } as never);
const uploadImage = vi.spyOn(productsApi, "uploadImage").mockResolvedValue({} as never);
beforeEach(() => {
  create.mockClear();
  uploadImage.mockClear();
});

const renderForm = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <ProductFormPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );

test("shows validation errors and does not submit invalid data (FR-11)", async () => {
  renderForm();
  await userEvent.type(await screen.findByLabelText("Price"), "-5");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(await screen.findByText("At least 2 characters")).toBeInTheDocument();
  expect(screen.getByText("Must be above 0")).toBeInTheDocument();
  expect(screen.getByText("Pick a category")).toBeInTheDocument();
  expect(create).not.toHaveBeenCalled();
});

test("submits valid data as numbers (FR-11)", async () => {
  renderForm();
  await userEvent.type(await screen.findByLabelText("Name"), "Stapler");
  await userEvent.type(screen.getByLabelText("Price"), "4.5");
  await userEvent.type(screen.getByLabelText("Stock"), "10");
  await userEvent.selectOptions(screen.getByLabelText("Category"), "1");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await vi.waitFor(() =>
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ name: "Stapler", price: 4.5, stock: 10, reorderLevel: 5, categoryId: 1 })),
  );
  expect(uploadImage).not.toHaveBeenCalled(); // no photo chosen
});

test("uploads the chosen photo for the new product after saving (FR-17)", async () => {
  renderForm();
  const photo = new File(["fake image"], "stapler.png", { type: "image/png" });
  await userEvent.upload(await screen.findByLabelText("Photo"), photo);
  expect(screen.getByAltText("New photo preview")).toBeInTheDocument();
  await userEvent.type(screen.getByLabelText("Name"), "Stapler");
  await userEvent.type(screen.getByLabelText("Price"), "4.5");
  await userEvent.type(screen.getByLabelText("Stock"), "10");
  await userEvent.selectOptions(screen.getByLabelText("Category"), "1");
  await userEvent.click(screen.getByRole("button", { name: "Save" }));
  await vi.waitFor(() => expect(uploadImage).toHaveBeenCalledWith(7, photo)); // 7 = the id of the created product
});

test("refuses a file that is not a photo (FR-17)", async () => {
  const user = userEvent.setup({ applyAccept: false }); // let the wrong file through the file picker
  renderForm();
  await user.upload(await screen.findByLabelText("Photo"), new File(["hello"], "notes.txt", { type: "text/plain" }));
  expect(screen.getByText("Use a JPG, PNG, WebP or GIF image")).toBeInTheDocument();
});
