import Logger from "@reactioncommerce/logger";
import { Shops } from "/lib/collections";
import Reaction from "../Reaction";
import register from "../no-meteor/register";
import startNodeApp from "./startNodeApp";
import Accounts from "./accounts";
import "./browser-policy";
import CollectionSecurity from "./collection-security";
import { importAllTranslations } from "./i18n";
import LoadFixtureData from "./load-data";
import Prerender from "./prerender";
import RateLimiters from "./rate-limits";
import setupCdn from "./cdn";

const { REACTION_METEOR_APP_COMMAND_START_TIME } = process.env;

/**
 * @summary Core startup function
 * @returns {undefined}
 */
export default function startup() {
  const startTime = Date.now();

  // This env may be set by the launch script, allowing us to time how long Meteor build/startup took.
  if (REACTION_METEOR_APP_COMMAND_START_TIME) {
    const elapsedMs = startTime - Number(REACTION_METEOR_APP_COMMAND_START_TIME);
    Logger.info(`Meteor startup finished: ${elapsedMs}ms (This is incorrect if this is a restart.)`);
  }

  setupCdn();
  Accounts();

  Reaction.whenAppInstanceReady(register);

  // initialize shop registry when a new shop is added
  Shops.find().observe({
    added(doc) {
      Reaction.setShopName(doc);
      Reaction.setDomain();
    },
    removed() {
      // TODO SHOP REMOVAL CLEANUP FOR #357
    }
  });

  LoadFixtureData();
  Reaction.init();

  importAllTranslations();

  Prerender();
  CollectionSecurity();
  RateLimiters();

  startNodeApp({
    async onAppInstanceCreated(app) {
      await Reaction.onAppInstanceCreated(app);
    }
  })
    .then(() => {
      const endTime = Date.now();
      Logger.info(`Reaction initialization finished: ${endTime - startTime}ms`);

      return null;
    })
    .catch((error) => {
      Logger.error(error);
    });
}
