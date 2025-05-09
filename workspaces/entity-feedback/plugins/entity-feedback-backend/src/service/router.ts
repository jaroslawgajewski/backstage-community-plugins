/*
 * Copyright 2023 The Backstage Authors
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

import {
  AuthService,
  DatabaseService,
  DiscoveryService,
  HttpAuthService,
  LoggerService,
} from '@backstage/backend-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';
import {
  Entity,
  RELATION_OWNED_BY,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { IdentityApi } from '@backstage/plugin-auth-node';
import {
  EntityRatingsData,
  Ratings,
} from '@backstage-community/plugin-entity-feedback-common';
import { InputError } from '@backstage/errors';
import express from 'express';
import Router from 'express-promise-router';
import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { DatabaseHandler } from './DatabaseHandler';
import { Config } from '@backstage/config';
import {
  NotificationRecipients,
  NotificationService,
} from '@backstage/plugin-notifications-node';
import { NotificationPayload } from '@backstage/plugin-notifications-common';

/**
 * @public
 */
export interface RouterOptions {
  database: DatabaseService;
  discovery: DiscoveryService;
  identity?: IdentityApi;
  logger: LoggerService;
  auth: AuthService;
  httpAuth: HttpAuthService;
  config: Config;
  notificationService: NotificationService;
}

/**
 * @public
 */
export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const {
    database,
    discovery,
    logger,
    httpAuth,
    auth,
    config,
    notificationService,
  } = options;

  logger.info('Initializing Entity Feedback backend');

  const catalogClient = new CatalogClient({ discoveryApi: discovery });
  const db = await database.getClient();
  const dbHandler = await DatabaseHandler.create({ database: db });

  const router = Router();
  router.use(express.json());

  router.get('/ratings', async (req, res) => {
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await httpAuth.credentials(req),
      targetPluginId: 'catalog',
    });

    const requestedEntities: { [ref: string]: Entity } = {};
    if (req.query.ownerRef) {
      // Get ratings from all owned entities (also ensures only accessible entities are requested)
      (
        await catalogClient.getEntities(
          {
            filter: { 'relations.ownedBy': req.query.ownerRef as string },
            fields: [
              'kind',
              'metadata.name',
              'metadata.namespace',
              'metadata.title',
            ],
          },
          { token },
        )
      ).items.forEach(ent => {
        requestedEntities[stringifyEntityRef(ent)] = ent;
      });
    } else {
      const allRatedEntities = await dbHandler.getAllRatedEntities();

      // Filter entities to only expose entity refs accessible by current user
      (
        await catalogClient.getEntitiesByRefs(
          {
            entityRefs: allRatedEntities,
            fields: [
              'kind',
              'metadata.namespace',
              'metadata.name',
              'metadata.title',
            ],
          },
          { token },
        )
      ).items
        .filter(Boolean)
        .forEach(ent => {
          requestedEntities[stringifyEntityRef(ent!)] = ent!;
        });
    }

    const entityRatings = await dbHandler.getRatingsAggregates(
      Object.keys(requestedEntities),
    );

    // Merge rating aggregates into a condensed per entity structure
    const entityRatingsMap = entityRatings.reduce<{
      [ref: string]: EntityRatingsData;
    }>((ratingsMap, { entityRef, rating, count }) => {
      ratingsMap[entityRef] = ratingsMap[entityRef] ?? {
        entityRef,
        entityTitle: requestedEntities[entityRef].metadata.title,
        ratings: {},
      };
      ratingsMap[entityRef].ratings[rating] = count;
      return ratingsMap;
    }, {});

    res.json(Object.values(entityRatingsMap));
  });

  router.post('/ratings/:entityRef(*)', async (req, res) => {
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });

    const rating = req.body.rating;
    if (!rating) {
      throw new InputError(
        `Can't save rating because there is not enough info: user=${credentials.principal.userEntityRef}, rating=${rating}`,
      );
    }

    await dbHandler.recordRating({
      entityRef: req.params.entityRef,
      rating,
      userRef: credentials.principal.userEntityRef,
    });

    res.status(201).end();
  });

  router.get('/ratings/:entityRef(*)/aggregate', async (req, res) => {
    const entityRatings = (
      await dbHandler.getRatings(req.params.entityRef)
    ).reduce((ratings: Ratings, { rating }) => {
      ratings[rating] = (ratings[rating] ?? 0) + 1;
      return ratings;
    }, {});

    res.json(entityRatings);
  });

  router.get('/ratings/:entityRef(*)', async (req, res) => {
    const ratings = await dbHandler.getRatings(req.params.entityRef);

    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await httpAuth.credentials(req),
      targetPluginId: 'catalog',
    });

    // Filter ratings via user refs to only expose entity refs accessible by current user
    const accessibleEntityRefs = (
      await catalogClient.getEntitiesByRefs(
        {
          entityRefs: ratings.map(r => r.userRef),
          fields: ['kind', 'metadata.namespace', 'metadata.name'],
        },
        { token },
      )
    ).items
      .filter(Boolean)
      .map(ent => stringifyEntityRef(ent!));

    res.json(ratings.filter(r => accessibleEntityRefs.includes(r.userRef)));
  });

  router.post('/responses/:entityRef(*)', async (req, res) => {
    const { response, comments, consent } = req.body;
    const credentials = await httpAuth.credentials(req, { allow: ['user'] });
    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: credentials,
      targetPluginId: 'catalog',
    });

    try {
      const entityOwner =
        (
          await catalogClient.getEntityByRef(req.params.entityRef, {
            token: token,
          })
        )?.relations?.find(rel => rel.type === RELATION_OWNED_BY)?.targetRef ||
        '';

      const recipients: NotificationRecipients = {
        type: 'entity',
        entityRef: entityOwner,
      };
      const payload: NotificationPayload = {
        title: `New feedback for ${req.params.entityRef}`,
        description: `Comments: ${JSON.parse(comments).additionalComments}`,
      };
      await notificationService.send({
        recipients,
        payload,
      });
    } catch (error) {
      logger.error(
        `Failed to send notification for feedback: ${error}, entityRef: ${req.params.entityRef}`,
      );
    }

    await dbHandler.recordResponse({
      entityRef: req.params.entityRef,
      response,
      comments,
      consent,
      userRef: credentials.principal.userEntityRef,
    });

    res.status(201).end();
  });

  router.get('/responses/:entityRef(*)', async (req, res) => {
    const responses = await dbHandler.getResponses(req.params.entityRef);

    const { token } = await auth.getPluginRequestToken({
      onBehalfOf: await httpAuth.credentials(req),
      targetPluginId: 'catalog',
    });

    console.log(responses);
    // Filter responses via user refs to only expose entity refs accessible by current user
    const accessibleEntityRefs = (
      await catalogClient.getEntitiesByRefs(
        {
          entityRefs: responses.map(r => r.userRef),
          fields: ['kind', 'metadata.namespace', 'metadata.name'],
        },
        { token },
      )
    ).items
      .filter(Boolean)
      .map(ent => stringifyEntityRef(ent!));

    res.json(responses.filter(r => accessibleEntityRefs.includes(r.userRef)));
  });

  router.use(MiddlewareFactory.create({ config, logger }).error());
  return router;
}
