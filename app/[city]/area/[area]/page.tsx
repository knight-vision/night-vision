import { redirect } from "next/navigation";
import { getCity } from "@/lib/cities";

export default function LegacyCityAreaPage({ params }: { params: { city: string; area: string } }) {
  const city = getCity(params.city);
  if (city) redirect(`/${city.prefectureKey}/${city.key}/area/${params.area}`);
  redirect("/");
}
