# perspectives.json

The attendance records behind the three figures on `/work/perspectives/`: the network (05), the
reproduction metric (06) and the topic graph (07). `perspectivesViz.js` reads this file at build
time and draws all three. Nothing on those figures is typed in by hand. If the file has no rows,
each figure says so in a hatched box instead of drawing.

## Shape

```json
{
  "config": { "anchor_min": 3 },
  "rows": [ { ...one attendance... }, ... ]
}
```

**One row per attendance**: one person in one circle. A circle of 9 people is 9 rows. The
initiator gets a row too, for every circle they ran. They were in the room.

| field | type | meaning |
|---|---|---|
| `circle_id` | string | Your ID for the circle, e.g. `E14`. Same value on every row of that circle. |
| `date` | `YYYY-MM-DD` | The day it ran. Order matters: ties and reproduction are read in date order. |
| `city` | string | `delhi` or `bangalore`, lowercase, spelled the same way every time. |
| `topic` | string | The topic the circle was announced under. Not anything said inside it. Same spelling each time it recurs, or it counts as a new topic. |
| `topic_category` | string | The theme the topic belongs to. Topics on one theme cluster together in the graph. |
| `initiator` | hashed id | The person who opened the room and ran the protocol. Same hash as their `participant_id`. |
| `host` | hashed id or venue slug | Who held the space. Not used by the figures yet. Confirm what it should mean. |
| `participant_id` | hashed id | The person this row is about. |
| `is_repeat` | bool | `true` if this person attended any earlier circle. |
| `later_initiated` | bool | `true` if this person initiates a circle dated **after** this one. |
| `sample` | bool | Only on the placeholder rows. Any row with it makes the page print a sample-data warning. Real rows leave it out. |

`config.anchor_min` is the number of circles that makes someone an anchor (a ring in the network,
and the denominator of "anchors hold N% of repeat attendance"). The 3 in the file is a placeholder.
Set it to whatever definition finding 04 uses.

## What the figures compute

- **Network.** A person is a node, sized by circles attended and placed in the city they attended
  most. Two people who shared a circle are a tie. A tie is drawn dark if, at the date it formed,
  there was no chain of earlier circles connecting the two. That is a statement about Perspectives
  only: the records cannot know who knew each other outside.
- **Reproduction.** Of everyone who ever appears as `initiator`, the share who attended a circle
  they did not run before the first one they did. Computed from dates and IDs, not from
  `later_initiated`. The page warns if `later_initiated` is set for someone who never initiated.
- **Topic graph.** A topic is a node, sized by number of circles. Two topics are linked when at
  least one person attended both; the line's weight is how many did.

## Hashing IDs

No names, phone numbers or emails go in this file. It is public, in the repo and on the site.
Hash every person with a salt that stays on your machine, and use the same function for
`initiator`, `host` (when it is a person) and `participant_id`:

```python
import hashlib
SALT = "keep-this-out-of-git"           # any long random string; never commit it
def pid(contact):                        # contact = the phone or email you know them by
    norm = contact.strip().lower().replace(" ", "")
    return hashlib.sha256((SALT + norm).encode()).hexdigest()[:12]
```

Twelve hex characters is plenty for a thousand people. Keep the salt: you need the same one
every time you regenerate the file, or the same person gets two IDs.

## Replacing the sample

Every current row has `"sample": true` and IDs starting `smp-`. Delete all of them, paste the real
rows, run `npx @11ty/eleventy`, and check the warnings are gone from (05), (06) and (07).
