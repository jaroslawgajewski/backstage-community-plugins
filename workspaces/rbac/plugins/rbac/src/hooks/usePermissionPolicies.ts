/*
 * Copyright 2024 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { useMemo } from 'react';
import { useAsyncRetry, useInterval } from 'react-use';

import { useApi } from '@backstage/core-plugin-api';

import { rbacApiRef, DefaultPermissionPolicy } from '../api/RBACBackendClient';
import { getPluginsPermissionPoliciesData } from '../utils/create-role-utils';
import {
  RoleBasedPolicy, // Ensure RoleBasedPolicy is imported if not already
  getConditionalPermissionsData,
  getPermissionsData,
} from '../utils/rbac-utils';

const getErrorText = (
  policies: any,
  permissionPolicies: any,
  conditionalPolicies: any,
  defaultPermissionsVal: any, // Add defaultPermissionsVal
): { name: number; message: string } | undefined => {
  if (!Array.isArray(policies) && (policies as Response)?.statusText) {
    return {
      name: (policies as Response).status,
      message: `Error fetching policies. ${(policies as Response).statusText}`,
    };
  } else if (
    !Array.isArray(permissionPolicies) &&
    (permissionPolicies as Response)?.statusText
  ) {
    return {
      name: (permissionPolicies as Response).status,
      message: `Error fetching the plugins. ${
        (permissionPolicies as Response).statusText
      }`,
    };
  } else if (
    !Array.isArray(conditionalPolicies) &&
    (conditionalPolicies as Response)?.statusText
  ) {
    return {
      name: (conditionalPolicies as Response).status,
      message: `Error fetching the conditional permission policies. ${
        (conditionalPolicies as Response).statusText
      }`,
    };
  } else if (
    !Array.isArray(defaultPermissionsVal) && // Check for defaultPermissionsVal
    (defaultPermissionsVal as Response)?.statusText
  ) {
    return {
      name: (defaultPermissionsVal as Response).status,
      message: `Error fetching default permissions. ${
        (defaultPermissionsVal as Response).statusText
      }`,
    };
  }
  return undefined;
};

export const usePermissionPolicies = (
  entityReference: string,
  pollInterval?: number,
) => {
  const rbacApi = useApi(rbacApiRef);
  const {
    value: policies,
    retry: policiesRetry,
    error: policiesError,
  } = useAsyncRetry(async () => {
    return await rbacApi.getAssociatedPolicies(entityReference);
  });

  const {
    value: conditionalPolicies,
    retry: conditionalPoliciesRetry,
    error: conditionalPoliciesError,
  } = useAsyncRetry(async () => {
    return await rbacApi.getRoleConditions(entityReference);
  });

  const {
    value: permissionPolicies,
    error: permissionPoliciesError,
    retry: permissionPoliciesRetry,
  } = useAsyncRetry(async () => {
    return await rbacApi.listPermissions();
  });

  const {
    value: defaultPermissions,
    retry: defaultPermissionsRetry,
    error: defaultPermissionsError,
  } = useAsyncRetry(async () => {
    return await rbacApi.getDefaultPermissions();
  });

  const loading =
    !permissionPoliciesError &&
    !policiesError &&
    !conditionalPoliciesError &&
    !defaultPermissionsError && // Add this
    (!permissionPolicies || !policies || !conditionalPolicies || !defaultPermissions); // Add !defaultPermissions

  const allPermissionPolicies = useMemo(
    () => (Array.isArray(permissionPolicies) ? permissionPolicies : []),
    [permissionPolicies],
  );

  const data = useMemo(() => {
    return Array.isArray(policies)
      ? getPermissionsData(policies, allPermissionPolicies)
      : [];
  }, [allPermissionPolicies, policies]);

  const conditionsData = useMemo(() => {
    const cpp = Array.isArray(conditionalPolicies) ? conditionalPolicies : [];
    const pluginsPermissionsPoliciesData =
      allPermissionPolicies.length > 0
        ? getPluginsPermissionPoliciesData(allPermissionPolicies)
        : undefined;
    return pluginsPermissionsPoliciesData
      ? getConditionalPermissionsData(
          cpp,
          pluginsPermissionsPoliciesData,
          allPermissionPolicies,
        )
      : [];
  }, [allPermissionPolicies, conditionalPolicies]);

  useInterval(
    () => {
      policiesRetry();
      permissionPoliciesRetry();
      conditionalPoliciesRetry();
      defaultPermissionsRetry(); // Add this
    },
    loading ? null : pollInterval || null,
  );

  const processedDefaultPermissions = useMemo(() => {
    if (Array.isArray(defaultPermissions)) {
      return defaultPermissions.map(dp => ({
        entityReference: '<default>', // Special marker for default policies
        permission: dp.permission,
        policy: dp.policy, // 'policy' from default is 'action' in RoleBasedPolicy
        effect: dp.effect,
        metadata: { source: 'default' }, // Indicate source
      } as RoleBasedPolicy)); // Cast to RoleBasedPolicy or a compatible type
    }
    return [];
  }, [defaultPermissions]);

  return {
    loading,
    rolePolicies: [...conditionsData, ...data], // Existing combined data
    defaultPolicies: processedDefaultPermissions, // New field for defaults
    retry: { policiesRetry, permissionPoliciesRetry, conditionalPoliciesRetry, defaultPermissionsRetry },
    error:
      policiesError ||
      permissionPoliciesError ||
      conditionalPoliciesError ||
      defaultPermissionsError || // Add this
      getErrorText(policies, permissionPolicies, conditionalPolicies, defaultPermissions), // Pass defaultPermissions
  };
};
