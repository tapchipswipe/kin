# Contributor Invites (v2)

Lightweight invite-to-contribute flow — planned after the grandparent UX refinements.

## Current interim: branch handoff

Grandparents build their side in their own account, then use **Send my branch to family** in the app header (senior mode) or **Export Tree** (full mode). This downloads a JSON file and opens an email draft so they can send it to the family organizer, who imports via **Import saved file**.

## Planned: invite link

1. Organizer generates an invite from their tree: "Grandma adds her branch"
2. Grandparent opens link → signs up with email and password → lands in organizer's tree as **guest contributor**
3. Contributor UI: simplified add-person flow only; changes saved to organizer's tree
4. Schema sketch: `tree_invites(id, tree_id, token, role, branch_side, expires_at)`

See also [COLLABORATION_V2.md](./COLLABORATION_V2.md) for full linked-trees design.
