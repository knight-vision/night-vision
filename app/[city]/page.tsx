import { redirect } from "next/navigation";
import { getCity } from "@/lib/cities";

export default function LegacyCityPage({ params }: { params: { city: string } }) {
  const city = getCity(params.city);
  if (city) redirect(`/${city.prefectureKey}/${city.key}`);
  redirect("/");
}
