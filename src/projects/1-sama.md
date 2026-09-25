---
title: Sama
subtitle: A peer-to-peer trading layer for urban rooftop solar, built on the India Energy Stack. Research, regulatory analysis, and a working seller-side module.
question: what would it take for a household to see, price and trade the energy it makes?
desc: p2p rooftop solar · india energy stack
topics: [energy, data]
size: lg
offset: off-70
qsize: 26px
fig: one feeder, and the two prices on it
role: research · systems design · python
period: 2026, ongoing
context: rooftop solar · urban indian prosumers · india energy stack
status: live research · module built, not yet piloted
live: true
date: 2026-06-01
card: L
thumb: /assets/projects/sama/00.jpg
thumbw: 1200
thumbh: 800
# Made images, not photographs: scripts/make-sama-cover.py draws them from the page's own
# numbers, in the language of the reference Raghav picked (images/sama/Recording ....gif).
# Nothing in them is data. They stand in until the nine figures below are drawn.
covers:
  - { t: /assets/projects/sama/c1.jpg, f: /assets/projects/sama/c1-f.jpg, w: 1200, h: 800 }
  - { t: /assets/projects/sama/c2.jpg, f: /assets/projects/sama/c2-f.jpg, w: 1200, h: 800 }
  - { t: /assets/projects/sama/c3.jpg, f: /assets/projects/sama/c3-f.jpg, w: 1200, h: 800 }
  - { t: /assets/projects/sama/c4.jpg, f: /assets/projects/sama/c4-f.jpg, w: 1200, h: 800 }
  - { t: /assets/projects/sama/c5.jpg, f: /assets/projects/sama/c5-f.jpg, w: 1200, h: 800 }
lead: "A rooftop owner in an Indian city generates a unit of electricity she does not use. It goes to the grid. She is paid about ₹2.50 for it. The same unit clears the market at ₹6.40 to ₹6.80. She does not know this, because nothing in her house tells her. The meter reads a net number once a month. It does not say what she produced, when she produced it, where it went, or what it was worth to whoever received it. She has made something and sold it, and she has been told neither the quantity nor the price."
next: Climate Code India · thirty tools in thirty days
# The nine figure slots, each with the caption it has to earn. Uncomment a block once the drawing
# exists at that path (and fill w/h). Priority order: fig.05, fig.03, fig.06, fig.02.
# open: { src: /assets/projects/sama/01.jpg, w: , h: , fig: fig.01, cap: "The generation curve of a single rooftop across one day, with the household's own consumption drawn under it and the exported surplus as the gap between the two. The gap is the subject of this project." }
chapters:
  - n: "00"
    name: the gap
    title: What a rooftop owner is not told
    # plates:
    #   - { src: /assets/projects/sama/02.jpg, w: , h: , fig: fig.02, cap: "The gross spread and the deductions against it, drawn as a waterfall: export tariff, wheeling, banking, cross-subsidy surcharge, platform fee, and what is left. One column per state framework." }
  - n: "01"
    name: the rails
    title: The settlement layer arrived before the product did
    side: left
    # plates:
    #   - { src: /assets/projects/sama/03.jpg, w: , h: , fig: fig.03, cap: "The stack: the physical layer of inverter and meter, the protocol layer of the Energy Stack and Beckn, and the missing product layer at the top. Sama sits in the gap at the top of the drawing." }
  - n: "02"
    name: the regulation
    title: Who is allowed to sell a unit to their neighbour
    # plates:
    #   - { src: /assets/projects/sama/04.jpg, w: , h: , fig: fig.04, cap: "The regulatory map: three states, the provisions that permit or constrain peer trade in each, and where the sandbox route sits." }
  - n: "03"
    name: the counterparty
    title: What the utility sees when a rooftop appears
    side: left
    # plates:
    #   - { src: /assets/projects/sama/05.jpg, w: , h: , fig: fig.05, cap: "The DISCOM's view against the household's view of the same feeder. Two drawings of one network: what the utility can see, and what the rooftop owner can see. Neither is the whole thing." }
  - n: "04"
    name: the architecture
    title: A seller-side module, and what it has to know
    # plates:
    #   - { src: /assets/projects/sama/06.jpg, w: , h: , fig: fig.06, cap: "The system architecture: inverter and meter into the seller module, the Beckn exchange with the buyer side, and the settlement path." }
    #   - { src: /assets/projects/sama/07.jpg, w: , h: , fig: fig.07, cap: "The module running. A real catalogue published and a real order handled." }
  - n: "05"
    name: the interface
    title: What a household needs to see before it will trade
    side: left
    # plates:
    #   - { src: /assets/projects/sama/08.jpg, w: , h: , fig: fig.08, cap: "Interaction prototype: the trading interface at the moment of decision." }
  - n: "06"
    name: what it becomes
    title: From a trade to a coordinated fleet
    # plates:
    #   - { src: /assets/projects/sama/09.jpg, w: , h: , fig: fig.09, cap: "The aggregation layer: individual rooftops, the coordinating agent, and the flexibility offered to the distribution utility." }
outcome:
  built: "Sama. A peer-to-peer trading layer for urban rooftop solar on the India Energy Stack and the Beckn protocol. A working Python seller-side module; technical research across inverter APIs, multi-agent coordination and the UEI protocol; a regulatory analysis of peer trade across the Karnataka, Delhi and Uttar Pradesh commissions; and a research essay, The Grid Rewires Itself. Shaped by work with distribution utility teams on mapping and managing a distribution network with better data. Independent work, 2026, ongoing."
  next: "Three things, in order. Establish the real spread: recompute the gap net of wheeling, banking, cross-subsidy surcharge and platform fee under each state framework, so that the number this project quotes is the number a household would actually see. Find out what a household will trade on: twenty to thirty prosumer interviews and a handful of resident associations in Bengaluru, run the way I ran the Koliwada fieldwork, sitting with the thing as it is used rather than surveying it, and written up as a specification for the interface above. Then model the coordination and take it to the utility: treat the neighbourhood as a set of agents, households, aggregator and distribution company, each with its own objective and its own partial view, and simulate what different trading rules do to all three before proposing any of them to a regulator. The output that matters is not the households' gain, which is easy to show. It is whether a rule exists under which the utility is also better off. If one does, there is a sandbox to ask a DISCOM for: one feeder, one housing society, instrumented. If none does, that is worth knowing early and publishing."
---

Sama starts from the position that this is a legibility problem before it is a market
problem. The household is already an economic actor in the grid. It just cannot see the
transaction it is party to.

## 00 the gap

The export tariff and the market price are both public. The distance between them is not
hidden, it is simply never put in front of the person it applies to. There is no reading,
no statement, no app that resolves a month of net metering into what happened on a Tuesday
afternoon in April.

An honest note on the spread. ₹2.50 against ₹6.40 is the gross gap, and it is not what a
household would net. Wheeling charges, banking charges, the cross-subsidy surcharge and a
platform fee all sit between the two numbers, and they vary by state and by consumer
category. Establishing what actually survives those charges, under each state framework, is
the first piece of work this project owes itself. **A project that quotes the gross spread
as the opportunity has not done that work yet.**

## 01 the rails

India's Energy Stack went live in 2025. It applies to electricity roughly the logic UPI
applied to payments: a public protocol layer that any participant can build on, rather than
a private platform that has to be joined. Beckn, the protocol underneath it, describes
transactions between a buyer-side platform and a seller-side platform without either of them
belonging to the same company.

This is the part that changed. Peer-to-peer energy trading has been technically demonstrable
for a decade and commercially impossible for almost as long, because settlement between two
households required an intermediary willing to build and run it. The rails now exist as
public infrastructure. What does not exist is the thing an ordinary prosumer opens on a
phone.

## 02 the regulation

The protocol permits a trade that the state may not. Peer-to-peer trading in India is
governed state by state, and the regulators are in different places: the Karnataka, Delhi and
Uttar Pradesh commissions each treat open access, net metering and third-party sale under
different thresholds and different surcharges. Some of this is settled, some of it is sandbox
provision, and some of it is silence that a regulator has not yet had reason to break.

The reading I did across KERC, DERC and UPERC is the part of this project most likely to be
wrong in a year, which is why it is written down with dates attached. The conclusion it
points to is that the first deployment is not a launch but a sandbox: one feeder or one
housing society, agreed with a DISCOM that has something to learn from it.

## 03 the counterparty

Every description of peer-to-peer energy leaves out the third party at the table: the
distribution company whose wires the trade runs over. Part of my work at Resilience AI was
alongside distribution utility teams, on how a network could be mapped and managed with
better data. It was a short engagement, and it changed the design of this project anyway.

I had thought of the grid as instrumented. It is, but unevenly. Observability is concentrated
at the grid substation and thins out fast below it. The low-tension feeder, the part of the
network a rooftop actually connects to, is the part the operator can see least. Peer-to-peer
trading happens exactly there. That inverts the usual framing. A trading layer moving energy
around a feeder the utility cannot observe is not disruptive, it is invisible, and invisible
is what gets regulated away. So Sama starts from the opposite premise: **the utility sees the
trade, and the trade settles in terms the utility can already account for.**

The second thing I took from it was about numbers rather than wires. What stopped a utility
team acting on a risk score was never whether the score was accurate. It was whether anyone
could say why it had come out that way. A figure with no reason attached to it is a figure
nobody can defend upward to a regulator, so nothing gets spent against it. That constraint
turns out to be the household's problem too, at a different scale, and it runs through the
rest of this project. A number that cannot be explained does not get acted on, at any level
of the system.

Sitting behind both is the structural position the sector is in, which is public and well
documented rather than anything I observed. Distribution companies buy power on long-term
contracts they cannot exit, carry losses between what they send out and what they bill for,
and depend on commercial and industrial customers to cross-subsidise everyone else. Rooftop
solar arrives into that as revenue leaving through the customers they can least afford to
lose. A peer layer that only sharpens that problem has no route through a regulator. One that
pays its way in visibility and dispatchable capacity might.

## 04 the architecture

The working code is the seller-side platform. It reads generation from the inverter, holds
the household's position, publishes what is available and at what price, and handles the
protocol exchange through to settlement.

The hard part is not the protocol, which is specified. It is everything the module has to
know before it can quote a price: what the household is about to consume, what the rooftop is
about to generate under the next hour of cloud, what the household is willing to let go of,
and what the grid is paying at that moment. **A quote is a small forecast with a commitment
attached.**

## 05 the interface

A market that a person has to reason about with a spreadsheet is a market they will not use.
This is the question the project is really organised around, and it is closer to interface
research than to energy engineering: what is the smallest set of things a household must see
before it will choose to trade rather than default to the utility?

Some candidates, all of them testable. The live position, generating and consuming, in units
rather than rupees. The price at this moment against the utility's price, as one comparison
rather than two numbers. A decision that can be made once and left alone, rather than a
market to be watched. And an account after the fact that says what was traded and to whom,
because trust in a settlement layer is built retrospectively.

Underneath all of them is the constraint from section 03, arriving at the other end of the
system. The utility would not act on a risk score nobody could explain. A household will not
trade on a price it cannot reason about. Same failure, two very different rooms.

## 06 what it becomes

Peer trade is the wedge, not the business. A single household exporting three units is a
rounding error to a DISCOM. Several thousand households whose inverters and batteries can be
coordinated together are a dispatchable resource, which is the thing a distribution utility
is short of and will pay for.

That second layer is a coordination problem across many self-interested agents with partial
information, which is a research problem before it is a product. It is also the point at
which this project stops being about energy markets and starts being about how a city's
distributed infrastructure organises itself. And it is the version of Sama a distribution
utility would want to exist, which is the only version with a route through the regulator.
