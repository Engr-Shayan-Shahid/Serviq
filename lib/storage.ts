import { ownerSupabase } from "@/lib/supabase";

export async function uploadMenuImage(
  restaurantId: string,
  file: File,
  folder = "categories"
): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `${restaurantId}/${folder}/${crypto.randomUUID()}.${ext}`;

  const { error } = await ownerSupabase.storage
    .from("menu-images")
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (error) {
    throw error;
  }

  const { data } = ownerSupabase.storage.from("menu-images").getPublicUrl(path);
  return data.publicUrl;
}
