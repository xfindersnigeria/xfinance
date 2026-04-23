"use client";
import React, { Fragment, Suspense } from "react";
import { AlertError } from "../../../custom/alert/Error";
import Loader from "@/app/loading";
import { useSessionStore } from "@/lib/store/session";
import { ENUM_ROLE } from "@/lib/types/enums";

type userNode = {
  superadmin: React.ReactNode;
  admin: React.ReactNode;
  user: React.ReactNode;
};

const DashboardView = ({ type }: { type: userNode }) => {
  const loading = useSessionStore((state) => state.loading);
  const user = useSessionStore((state) => state.user);
  const role = useSessionStore((state) => state.getEffectiveRole());
  const isImpersonating = useSessionStore((state) => state.isImpersonating());

  if (loading) {
    return <Loader />;
  }

  if (!user || !role || !Object.values(ENUM_ROLE).includes(role)) {
    return <NotLoggedIn message="You are not authorized to view this page." />;
  }

  const view = type[role as keyof userNode];

  if (!view) {
    return <NotLoggedIn message="You are not authorized to view this page." />;
  }

  return (
    <Fragment>
      <Suspense fallback={<Loader />}>
        <main className="" data-impersonating={isImpersonating ? "true" : "false"}>
          {view}
        </main>
      </Suspense>
    </Fragment>
  );
};

function NotLoggedIn({ message }: { message: string }) {
  return (
    <article className="flex w-full items-center justify-center h-screen">
      <div className="w-100">
        <AlertError message={message} />
      </div>
    </article>
  );
}

export default DashboardView;
