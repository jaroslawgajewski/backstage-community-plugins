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
import { TableColumn } from '@backstage/core-components';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';

import { PermissionsData } from '../../types';
import { getRulesNumber } from '../../utils/create-role-utils';

export const columns: TableColumn<PermissionsData>[] = [
  {
    title: 'Plugin',
    field: 'plugin',
    type: 'string',
  },
  {
    title: 'Permission',
    field: 'permission',
    type: 'string',
    render: (rowData: PermissionsData) => {
      if (rowData.metadata?.source === 'default') {
        return (
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: '8px' }}>{rowData.permission}</span>
            <Chip label="Default" size="small" variant="outlined" />
          </Box>
        );
      }
      return rowData.permission;
    },
  },
  {
    title: 'Policies',
    field: 'policyString', // This field might not be directly used by the new render for defaults
    type: 'string',
    render: (rowData: PermissionsData) => {
      if (rowData.metadata?.source === 'default') {
        if (rowData.effect === 'allow') {
          return <Chip label="Allow (Default)" size="small" style={{ backgroundColor: 'green', color: 'white', margin: '2px' }} />;
        } else if (rowData.effect === 'deny') {
          return <Chip label="Deny (Default)" size="small" style={{ backgroundColor: 'red', color: 'white', margin: '2px' }} />;
        } else {
          return <Chip label={`${rowData.effect} (Default)`} size="small" style={{ margin: '2px' }} />;
        }
      } else if (rowData.policies && rowData.policies.length > 0) {
        // Display multiple chips if there are multiple policies (e.g. for different actions)
        return (
          <Box style={{ display: 'flex', flexWrap: 'wrap' }}>
            {rowData.policies.map((p, index) => (
              <Chip
                key={`${p.permission}-${p.policy}-${index}`}
                label={p.effect === 'allow' ? 'Allow' : 'Deny'}
                size="small"
                style={{
                  backgroundColor: p.effect === 'allow' ? 'green' : 'red',
                  color: 'white',
                  margin: '2px',
                }}
              />
            ))}
          </Box>
        );
      }
      return '-';
    },
    customSort: (a: PermissionsData, b: PermissionsData) => {
      const isADefault = a.metadata?.source === 'default';
      const isBDefault = b.metadata?.source === 'default';

      if (isADefault && !isBDefault) {
        return -1; // Default policies come before non-default
      }
      if (!isADefault && isBDefault) {
        return 1;  // Non-default policies come after default
      }

      if (isADefault && isBDefault) {
        // Both are default, sort by effect then by permission name
        if (a.effect && b.effect) {
          if (a.effect !== b.effect) {
            return a.effect.localeCompare(b.effect);
          }
        }
        return a.permission.localeCompare(b.permission);
      }

      // Both are non-default (original logic, ensure policies arrays exist)
      const aPoliciesLen = a.policies?.length ?? 0;
      const bPoliciesLen = b.policies?.length ?? 0;

      if (aPoliciesLen === 0 && bPoliciesLen > 0) { return -1; }
      if (bPoliciesLen === 0 && aPoliciesLen > 0) { return 1; }
      // If lengths are equal, sort by the string representation of policies (e.g. policyString)
      // or by the first policy effect if available
      if (aPoliciesLen === bPoliciesLen) {
        if (aPoliciesLen === 0) return 0; // both empty
        // Fallback to comparing permission names if policies are structurally similar or to break ties
        return a.permission.localeCompare(b.permission);
      }
      return aPoliciesLen < bPoliciesLen ? -1 : 1;
    },
  },
  {
    title: 'Conditional',
    field: 'conditions',
    type: 'string',
    render: (permissionsData: PermissionsData) => {
      const totalRules = getRulesNumber(permissionsData.conditions);
      return totalRules
        ? `${totalRules} ${totalRules > 1 ? 'rules' : 'rule'}`
        : '-';
    },
  },
];
