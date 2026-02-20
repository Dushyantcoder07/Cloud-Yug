// Content Script for Cloud-Yug Focus Tracker
// Monitors user activity on web pages

(function () {
  "use strict";

  try {
    // Check if we're in extension context
    const isExtensionContext =
      typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.id;

    // Activity tracking
    let lastActivityTime = Date.now();
    let scrollCount = 0;
    let clickCount = 0;
    let keypressCount = 0;
    let focusLostCount = 0;
    let pageLoadTime = Date.now();

    // Debounce helper
    function debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    }

    // Calculate engagement score
    function calculateEngagementScore(time, scrolls, clicks, keypresses) {
      // Simple scoring algorithm
      const timeScore = Math.min(time / 60000, 10); // Max 10 points for time (1 point per minute, cap at 10)
      const interactionScore =
        (clicks * 2 + keypresses * 1.5 + scrolls * 0.5) / 10;

      return Math.min(Math.round(timeScore + interactionScore), 100);
    }

    // Track user activity
    function trackActivity(activityType) {
      lastActivityTime = Date.now();

      switch (activityType) {
        case "scroll":
          scrollCount++;
          break;
        case "click":
          clickCount++;
          break;
        case "keypress":
          keypressCount++;
          break;
      }
    }

    // Detect focus loss (tab switching away)
    document.addEventListener("visibilitychange", () => {
      try {
        if (document.hidden) {
          focusLostCount++;
          const timeOnPage = Date.now() - pageLoadTime;

          // If user left page quickly (< 10 seconds), might indicate distraction
          if (timeOnPage < 10000 && isExtensionContext) {
            chrome.runtime.sendMessage({
              type: "PAGE_ACTIVITY",
              data: {
                url: window.location.href,
                timeOnPage: timeOnPage,
                engagement: "low",
                scrollCount,
                clickCount,
                keypressCount,
              },
            });
          }
        }
      } catch (error) {
        console.warn("Cloud-Yug: Error in visibility change handler:", error);
      }
    });

    // Track scroll activity
    const handleScroll = debounce(() => {
      trackActivity("scroll");
    }, 500);

    // Track clicks
    document.addEventListener(
      "click",
      (e) => {
        trackActivity("click");
      },
      { passive: true },
    );

    // Track keyboard activity
    document.addEventListener(
      "keypress",
      () => {
        trackActivity("keypress");
      },
      { passive: true },
    );

    // Track scrolling
    window.addEventListener("scroll", handleScroll, { passive: true });

    // Detect excessive scrolling (doom scrolling)
    setInterval(() => {
      try {
        const now = Date.now();
        const timeSinceLoad = now - pageLoadTime;

        // If lots of scrolling but few clicks/keypresses in 5 minutes
        if (timeSinceLoad > 300000) {
          // 5 minutes
          const engagementRatio =
            (clickCount + keypressCount) / (scrollCount || 1);

          if (
            scrollCount > 100 &&
            engagementRatio < 0.1 &&
            isExtensionContext
          ) {
            chrome.runtime.sendMessage({
              type: "DOOM_SCROLLING_DETECTED",
              data: {
                url: window.location.href,
                scrollCount,
                duration: timeSinceLoad,
              },
            });

            // Reset counters
            scrollCount = 0;
            pageLoadTime = now;
          }
        }
      } catch (error) {
        console.warn("Cloud-Yug: Error in doom scrolling detection:", error);
      }
    }, 60000); // Check every minute

    // Send activity summary on page unload
    window.addEventListener("beforeunload", () => {
      try {
        console.log("Cloud-Yug: beforeunload triggered");
        console.log("Cloud-Yug: pageLoadTime:", pageLoadTime);
        console.log("Cloud-Yug: scrollCount:", scrollCount);
        console.log("Cloud-Yug: clickCount:", clickCount);
        console.log("Cloud-Yug: keypressCount:", keypressCount);

        const timeOnPage = Date.now() - pageLoadTime;
        const engagementScore = calculateEngagementScore(
          timeOnPage,
          scrollCount,
          clickCount,
          keypressCount,
        );

        console.log("Cloud-Yug: engagementScore:", engagementScore);

        if (isExtensionContext) {
          chrome.runtime.sendMessage({
            type: "PAGE_SUMMARY",
            data: {
              url: window.location.href,
              timeOnPage,
              scrollCount,
              clickCount,
              keypressCount,
              focusLostCount,
              engagementScore,
            },
          });
          console.log("Cloud-Yug: Message sent to background script");
        } else {
          console.warn("Cloud-Yug: Not in extension context, message not sent");
        }
      } catch (error) {
        console.error("Cloud-Yug: Error in beforeunload handler:", error);
      }
    });

    // Listen for messages from background script
    if (isExtensionContext) {
      chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        try {
          switch (message.type) {
            case "GET_PAGE_ACTIVITY":
              sendResponse({
                url: window.location.href,
                timeOnPage: Date.now() - pageLoadTime,
                scrollCount,
                clickCount,
                keypressCount,
                focusLostCount,
              });
              break;

            case "FOCUS_MODE_OVERLAY":
              // Could add a visual overlay for focus mode
              showFocusModeOverlay(message.enabled);
              sendResponse({ success: true });
              break;
          }
        } catch (error) {
          console.warn("Cloud-Yug: Error handling message:", error);
          sendResponse({ error: error.message });
        }

        return true;
      });
    }

    // Optional: Show focus mode overlay
    function showFocusModeOverlay(enabled) {
      try {
        let overlay = document.getElementById("cloud-yug-focus-overlay");

        if (enabled && !overlay) {
          overlay = document.createElement("div");
          overlay.id = "cloud-yug-focus-overlay";
          overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6);
          background-size: 200% 100%;
          animation: cloud-yug-gradient 3s ease infinite;
          z-index: 999999;
          pointer-events: none;
        `;

          // Add animation
          const style = document.createElement("style");
          style.textContent = `
          @keyframes cloud-yug-gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
        `;
          document.head.appendChild(style);
          document.body.appendChild(overlay);
        } else if (!enabled && overlay) {
          overlay.remove();
        }
      } catch (error) {
        console.warn("Cloud-Yug: Error managing focus overlay:", error);
      }
    }

    console.log("Cloud-Yug Focus Tracker content script loaded");
  } catch (globalError) {
    console.error(
      "Cloud-Yug: Critical error in content script initialization:",
      globalError,
    );
  }
})();
