(function initializeAnalytics(document, window) {
  'use strict';

  const config = window.__VEVDB_ANALYTICS__ || {};
  const projectKey = String(config.posthogProjectKey || '').trim();
  const apiHost = String(config.posthogApiHost || '').trim();
  const debug = window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1' ||
    new URLSearchParams(window.location.search).has('__posthog_debug');

  if (!projectKey) {
    if (debug) {
      console.error(new Error(
        'POSTHOG_PROJECT_KEY variable required by PostHog is missing or un-configured, ' +
        'this causes events to be silently missed. This error stops appearing once ' +
        'POSTHOG_PROJECT_KEY is configured'
      ));
    }
    return;
  }

  if (!apiHost) {
    if (debug) {
      console.error(new Error(
        'POSTHOG_API_HOST variable required by PostHog is missing or un-configured, ' +
        'this causes events to be silently missed. This error stops appearing once ' +
        'POSTHOG_API_HOST is configured'
      ));
    }
    return;
  }

  try {
    const parsedHost = new URL(apiHost);
    if (parsedHost.protocol !== 'https:') throw new Error('PostHog API host must use HTTPS');
  } catch (error) {
    if (debug) console.error(error);
    return;
  }

  !function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split('.');2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement('script')).type='text/javascript',p.crossOrigin='anonymous',p.async=!0,p.src=s.api_host.replace('.i.posthog.com','-assets.i.posthog.com')+'/static/array.js',(r=t.getElementsByTagName('script')[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a='posthog',u.people=u.people||[],Object.defineProperty(u,'toString',{configurable:!0,enumerable:!0,writable:!0,value:function(t){var e='posthog';return'posthog'!==a&&(e+='.'+a),t||(e+=' (stub)'),e}}),Object.defineProperty(u.people,'toString',{configurable:!0,enumerable:!0,writable:!0,value:function(){return u.toString(1)+'.people (stub)'}}),o='init capture register register_once register_for_session unregister unregister_for_session getFeatureFlag getFeatureFlagResult isFeatureEnabled reloadFeatureFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSessionId getSurveys getActiveMatchingSurveys renderSurvey canRenderSurvey getNextSurveyStep identify setPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException loadToolbar get_property getSessionProperty createPersonProfile opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing clear_opt_in_out_capturing debug'.split(' '),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);

  window.posthog.init(projectKey, {
    api_host: apiHost,
    defaults: '2026-05-30',
    cookieless_mode: 'always',
    person_profiles: 'never',
    disable_session_recording: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
    advanced_disable_flags: true
  });

  document.addEventListener('click', function captureIntent(event) {
    const link = event.target.closest?.('[data-analytics-event]');
    if (!link) return;

    const properties = {
      location: link.dataset.analyticsLocation || 'unknown',
      path: window.location.pathname
    };
    if (link.dataset.analyticsCapability) {
      properties.capability = link.dataset.analyticsCapability;
    }
    if (link.dataset.analyticsMethod) {
      properties.method = link.dataset.analyticsMethod;
    }

    window.posthog.capture(link.dataset.analyticsEvent, properties);
  });
})(document, window);
