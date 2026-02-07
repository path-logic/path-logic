# Why Vercel? A Pragmatic Pivot for Path Logic

I’ve spent a lot of time in the weeds with infrastructure. From AWS Lambda to Fly.io, I’ve tried most of the "modern" ways to ship a web app. For Path Logic, I’m leaning into Vercel. Here’s why—and it’s not because I’m some kind of fanboy, but because it actually solves the problems I care about right now.

## The "Frictionless" Fallacy

Every hosting provider claims to be effortless. But "effortless" usually breaks down the moment you need a real CI/CD pipeline, environment variable management, or preview deployments. Vercel’s GitHub integration is, quite frankly, the gold standard.

When I’m deep in a feature—say, refining the split-transaction logic—I don't want to think about Dockerfiles or Nginx configs. I want to push a branch, see a preview URL, and know that it’s running in an environment identical to production.

## Next.js 15+ Synergy

Since Path Logic is built on Next.js 15, staying within the Vercel ecosystem feels like path-of-least-resistance. The way they handle server components, streaming, and edge caching is just better when they own the whole stack. There’s a certain "it just works" factor that’s hard to ignore when you’re trying to move fast.

## The Cost of Complexity

I’ve seen plenty of projects die under the weight of their own infrastructure. You spend three days setting up a Kubernetes cluster for an app that has 10 users. Vercel’s free tier is generous, and their pro tier is reasonable enough that I can scale without a massive architectural overhaul.

## Pragmatism Over Purity

Is Vercel "vendor lock-in"? Sure, to an extent. But at this stage of Path Logic, I care about **shipping**. I care about getting the MVP into users' hands so I can see if the core value proposition—the forward-looking cashflow—actually resonates.

If this blows up and I need to move to a more "neutral" platform later, the code is still standard Next.js. I can take it elsewhere. But for now, I’m choosing focus over flexibility.

## Conclusion

Vercel isn't perfect, but it’s the most pragmatic choice for a solo developer or a small team trying to build something premium without hiring an SRE. It lets me focus on the code that matters: the ledger, the sync, and the security.
