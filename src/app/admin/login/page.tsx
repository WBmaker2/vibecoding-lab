import Image from "next/image";
import Link from "next/link";
import { loginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const hasError = params.error === "1";

  return (
    <main className="page-shell admin-login-page">
      <section className="admin-login-card">
        <p className="eyebrow">Admin Access</p>
        <h1>관리자 로그인</h1>
        <p className="admin-login-copy">
          새 앱 등록과 수정은 이 페이지에서 진행합니다.
        </p>

        <div className="admin-login-helper">
          <Image
            alt="관리자 안내를 돕는 Hong 캐릭터"
            className="admin-login-mascot"
            height={88}
            priority
            src="/images/mascots/hong-default.png"
            width={88}
          />
          <p>
            링크와 태그만 입력해도 빠르게 등록할 수 있고, 필요하면 과목·학년·메모를
            덧붙여 공개 정보까지 정리할 수 있습니다.
          </p>
        </div>

        <form action={loginAction} className="admin-login-form">
          <label className="admin-field">
            <span>관리자 비밀번호</span>
            <input name="password" required type="password" />
          </label>

          {hasError && (
            <p className="admin-form-error">
              비밀번호가 올바르지 않습니다. 다시 시도해 주세요.
            </p>
          )}

          <button className="admin-primary-button" type="submit">
            로그인
          </button>
        </form>

        <Link className="admin-text-link" href="/">
          공개 아카이브로 돌아가기
        </Link>
      </section>
    </main>
  );
}
