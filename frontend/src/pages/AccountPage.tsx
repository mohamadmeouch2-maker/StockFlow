import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm, type FieldValues, type Path, type UseFormSetError } from "react-hook-form";
import { z } from "zod";
import { accountApi } from "../api/account";
import { ApiError } from "../api/client";
import type { Account, ShipTo } from "../api/types";
import { useAuth } from "../auth/useAuth";
import { FormField } from "../components/FormField";
import { RowsSkeleton } from "../components/Skeleton";
import { useToast } from "../toast/useToast";
import { nameRule, passwordRule, shipToSchema } from "../utils/validation";

// The server's message for one field goes under that field; any other error is returned for an alert.
function showServerError<T extends FieldValues>(err: Error, setError: UseFormSetError<T>, fields: string[]) {
  const mine = err instanceof ApiError ? err.details.filter((d) => fields.includes(d.field)) : [];
  mine.forEach((d) => setError(d.field as Path<T>, { message: d.message }));
  return mine.length ? "" : err.message;
}

// My account: change my name, save a delivery address (customers) and change my password.
export function AccountPage() {
  const account = useQuery({ queryKey: ["account"], queryFn: accountApi.get, staleTime: 0 });
  const customer = account.data?.role === "CUSTOMER";

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div>
        <h1 className="page-title">My account</h1>
        <p className="text-sm text-slate-500">{customer ? "Your name, your delivery address and your password." : "Your name and your password."}</p>
      </div>
      {account.isLoading && <RowsSkeleton rows={3} />}
      {account.isError && <p className="text-danger-600">Could not load your account. {account.error.message}</p>}
      {account.data && (
        <>
          <DetailsForm account={account.data} />
          {customer && <AddressForm account={account.data} />}
          <PasswordForm />
        </>
      )}
    </div>
  );
}

// Name (can change) and email (the login, can't change)
function DetailsForm({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const { updateUser } = useAuth();
  const toast = useToast();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<{ name: string }>({ resolver: zodResolver(z.object({ name: nameRule })), defaultValues: { name: account.name } });

  const save = useMutation({
    mutationFn: (v: { name: string }) => accountApi.rename(v.name),
    onSuccess: (a) => {
      queryClient.setQueryData(["account"], a);
      updateUser({ id: a.id, name: a.name, email: a.email, role: a.role }); // the menu shows the new name
      reset({ name: a.name });
      toast("Your name is saved");
    },
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="card space-y-4 p-6">
      <h2 className="font-semibold text-slate-900">
        <span aria-hidden="true">👤 </span>Your details
      </h2>
      <FormField id="name" label="Name" autoComplete="name" maxLength={100} {...register("name")} error={errors.name?.message} />
      <div>
        <p className="label">Email</p>
        <p className="text-slate-900">{account.email}</p>
        <p className="mt-1 text-xs text-slate-500">You log in with your email, so it can't be changed here.</p>
      </div>
      {save.isError && <p className="alert-danger">Could not save your name. {save.error.message}</p>}
      <button disabled={!isDirty || save.isPending} className="btn btn-primary">
        {save.isPending ? "Saving..." : "Save name"}
      </button>
    </form>
  );
}

// The address the cart fills in for every order (customers only)
function AddressForm({ account }: { account: Account }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [serverError, setServerError] = useState("");
  const hasSaved = account.address !== null;
  const values = (a: Account): ShipTo => ({ phone: a.phone ?? "", city: a.city ?? "", address: a.address ?? "" });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm<ShipTo>({ resolver: zodResolver(shipToSchema), defaultValues: values(account) });

  const done = (a: Account, message: string) => {
    queryClient.setQueryData(["account"], a);
    queryClient.invalidateQueries({ queryKey: ["orders", "saved-address"] }); // the cart fills in the new one
    reset(values(a));
    toast(message, a.address ? "success" : "info");
  };
  const save = useMutation({
    mutationFn: (shipTo: ShipTo) => accountApi.saveAddress(shipTo),
    onMutate: () => setServerError(""),
    onSuccess: (a) => done(a, "Your delivery address is saved"),
    onError: (err) => setServerError(showServerError(err, setError, ["phone", "city", "address"])),
  });
  const remove = useMutation({
    mutationFn: () => accountApi.removeAddress(),
    onSuccess: (a) => done(a, "Your saved address is removed"),
    onError: (err) => setServerError(err.message),
  });

  return (
    <form onSubmit={handleSubmit((v) => save.mutate(v))} className="card space-y-4 p-6">
      <div>
        <h2 className="font-semibold text-slate-900">
          <span aria-hidden="true">📍 </span>Delivery address
        </h2>
        <p className="text-sm text-slate-500">
          {hasSaved ? "The cart fills this in for every order. You can still change it in the cart." : "Save it once, and the cart fills it in for every order."}
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="phone" label="Phone number" type="tel" autoComplete="tel" placeholder="+961 70 123 456" maxLength={25} {...register("phone")} error={errors.phone?.message} />
        <FormField id="city" label="City" autoComplete="address-level2" placeholder="Beirut" maxLength={60} {...register("city")} error={errors.city?.message} />
      </div>
      <div>
        <label htmlFor="address" className="label">
          Address
        </label>
        <textarea id="address" rows={2} autoComplete="street-address" placeholder="Street, building, floor" maxLength={300} {...register("address")} className="input" />
        {errors.address && <p className="field-error">{errors.address.message}</p>}
      </div>
      {serverError && <p className="alert-danger">{serverError}</p>}
      <div className="flex flex-wrap gap-2">
        <button disabled={!isDirty || save.isPending} className="btn btn-primary">
          {save.isPending ? "Saving..." : "Save address"}
        </button>
        {hasSaved && (
          <button type="button" disabled={remove.isPending} onClick={() => confirm("Remove your saved address?") && remove.mutate()} className="btn btn-outline">
            Remove
          </button>
        )}
      </div>
    </form>
  );
}

// Change the password: the current one first, then the new one twice
const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordRule,
    repeatPassword: z.string(),
  })
  .refine((v) => v.repeatPassword === v.newPassword, { message: "The two new passwords are not the same", path: ["repeatPassword"] })
  .refine((v) => v.newPassword !== v.currentPassword, { message: "Choose a password different from the current one", path: ["newPassword"] });
type PasswordValues = z.infer<typeof passwordSchema>;

function PasswordForm() {
  const toast = useToast();
  const [serverError, setServerError] = useState("");
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", repeatPassword: "" } });

  const change = useMutation({
    mutationFn: (v: PasswordValues) => accountApi.changePassword(v.currentPassword, v.newPassword),
    onMutate: () => setServerError(""),
    onSuccess: () => {
      reset();
      toast("Your password is changed. Use the new one next time you log in.");
    },
    // e.g. "The current password is not correct" under that field, or "Too many wrong passwords..."
    onError: (err) => setServerError(showServerError(err, setError, ["currentPassword", "newPassword"])),
  });

  return (
    <form onSubmit={handleSubmit((v) => change.mutate(v))} className="card space-y-4 p-6">
      <h2 className="font-semibold text-slate-900">
        <span aria-hidden="true">🔒 </span>Change password
      </h2>
      <FormField
        id="current-password"
        label="Current password"
        type="password"
        autoComplete="current-password"
        {...register("currentPassword")}
        error={errors.currentPassword?.message}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <FormField id="new-password" label="New password" type="password" autoComplete="new-password" {...register("newPassword")} error={errors.newPassword?.message} />
          <p className="mt-1 text-xs text-slate-500">At least 8 characters, with a letter and a number.</p>
        </div>
        <FormField
          id="repeat-password"
          label="New password again"
          type="password"
          autoComplete="new-password"
          {...register("repeatPassword")}
          error={errors.repeatPassword?.message}
        />
      </div>
      {serverError && <p className="alert-danger">{serverError}</p>}
      <button disabled={change.isPending} className="btn btn-primary">
        {change.isPending ? "Changing..." : "Change password"}
      </button>
    </form>
  );
}
