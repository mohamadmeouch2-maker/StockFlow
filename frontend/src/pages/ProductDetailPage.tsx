import { useParams } from "react-router-dom";

// Placeholder for now. Step 5 turns this into the real detail page (FR-05).
export function ProductDetailPage() {
  const { id } = useParams();
  return <h1 className="text-2xl font-bold">Product #{id}</h1>;
}
