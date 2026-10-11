import { router } from "expo-router";

import { ConfirmSheet } from "@/components/confirm-sheet";
import { signOut } from "@/lib/session";

export default function SignOutSheet() {
  return (
    <ConfirmSheet
      icon={{ ios: "rectangle.portrait.and.arrow.right", android: "logout", web: "logout" }}
      title="Αποσύνδεση"
      message="Θέλεις σίγουρα να αποσυνδεθείς;"
      confirmLabel="Αποσύνδεση"
      cancelLabel="Άκυρο"
      onConfirm={() => void signOut()}
      onCancel={() => router.back()}
    />
  );
}
