/*
 * Copyright (c) 2021 - 2023, Ludvig Lundgren and the autobrr contributors.
 * SPDX-License-Identifier: GPL-2.0-or-later
 */

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { RocketLaunchIcon } from "@heroicons/react/24/outline";

import { APIClient } from "@api/APIClient";
import { AuthContext } from "@utils/Context";
import Toast from "@components/notifications/Toast";
import { Tooltip } from "@components/tooltips/Tooltip";
import { PasswordInput, TextInput } from "@components/inputs/text";

import Logo from "@app/logo.svg?react";

type LoginFormFields = {
  username: string;
  password: string;
};

export const Login = () => {
  const { handleSubmit, register, formState } = useForm<LoginFormFields>({
    defaultValues: { username: "", password: "" },
    mode: "onBlur"
  });
  const navigate = useNavigate();
  const [, setAuthContext] = AuthContext.use();

  useEffect(() => {
    // remove user session when visiting login page'
    APIClient.auth.logout()
      .then(() => {
        AuthContext.reset();
      });

    // Check if onboarding is available for this instance
    // and redirect if needed
    APIClient.auth.canOnboard()
      .then(() => navigate("/onboard"))
      .catch(() => { /*don't log to console PAHLLEEEASSSE*/ });
  }, [navigate]);

  const loginMutation = useMutation({
    mutationFn: (data: LoginFormFields) => APIClient.auth.login(data.username, data.password),
    onSuccess: (_, variables: LoginFormFields) => {
      setAuthContext({
        username: variables.username,
        isLoggedIn: true
      });
      navigate("/");
    },
    onError: () => {
      toast.custom((t) => (
        <Toast type="error" body="Wrong password or username!" t={t} />
      ));
    }
  });

  const onSubmit = (data: LoginFormFields) => loginMutation.mutate(data);

  return (
    <div className="min-h-screen flex flex-col justify-center px-3">
      <div className="mx-auto w-full max-w-md mb-6">
        <Logo className="mx-auto h-12" />
        <h1 className="text-center text-gray-900 dark:text-gray-200 font-bold pt-2 text-2xl">
          autobrr
        </h1>
      </div>
      <div className="mx-auto w-full max-w-md rounded-2xl shadow-lg">
        <div className="px-8 pt-8 pb-4 rounded-2xl bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-775">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <TextInput<LoginFormFields>
              name="username"
              id="username"
              label="username"
              type="text"
              register={register}
              rules={{ required: "Username is required" }}
              errors={formState.errors}
              autoComplete="username"
            />
            <PasswordInput<LoginFormFields>
              name="password"
              id="password"
              label="password"
              register={register}
              rules={{ required: "Password is required" }}
              errors={formState.errors}
              autoComplete="current-password"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-blue-500"
            >
              <RocketLaunchIcon className="w-4 h-4 mr-1.5" />
              Sign in
            </button>
          </form>
          <div
            id="forgot"
            className="flex mt-2 justify-end items-center text-xs font-bold text-gray-700 dark:text-gray-200 uppercase tracking-wide"
          >
            <Tooltip
              label={
                <div className="flex flex-row items-center cursor-pointer">
                  Forgot? <svg className="ml-1 w-3 h-3 text-gray-500 dark:text-gray-400 fill-current" viewBox="0 0 72 72"><path d="M32 2C15.432 2 2 15.432 2 32s13.432 30 30 30s30-13.432 30-30S48.568 2 32 2m5 49.75H27v-24h10v24m-5-29.5a5 5 0 1 1 0-10a5 5 0 0 1 0 10" /></svg>
                </div>
              }
            >
              <p className="py-1">If you forget your password you can reset it via the terminal: <code>autobrrctl --config /home/username/.config/autobrr change-password $USERNAME</code></p>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
};
