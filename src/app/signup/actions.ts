"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const storeName = String(formData.get("storeName") ?? "").trim();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!storeName || !email || !password) {
    redirect(`/signup?error=${encodeURIComponent("すべての項目を入力してください")}`);
  }

  if (password.length < 8) {
    redirect(`/signup?error=${encodeURIComponent("パスワードは8文字以上で入力してください")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { store_name: storeName },
    },
  });

  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If email confirmation is enabled, no session is returned yet.
  if (!data.session) {
    redirect(
      `/login?message=${encodeURIComponent(
        "確認メールを送信しました。メール内のリンクから登録を完了してください。"
      )}`
    );
  }

  redirect("/dashboard");
}
