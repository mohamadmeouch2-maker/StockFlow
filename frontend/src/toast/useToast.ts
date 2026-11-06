import { useContext } from "react";
import { ToastContext } from "./toastContext";

// const toast = useToast();  toast("Product saved");  toast("Could not save", "error");
export const useToast = () => useContext(ToastContext);
