---
aliases:
  - "FoxDot ideas "
---

.solobar(len=1) solos at start of next bar, unsolos th bar after Len bars. The equivalent of Clem muting Alex for a bar and then back on.
Can you solo a group?

PBase(NUM, base=2, minlen=1) gets a pattern by converting the input number (might work with strings etc too) into a number base and splitting those digits into event of the pattern
So PBase (5)==P[1,0,1]

 PBase (5)==P[1,0,1]
  PBase (5,base=4, minlen=4)==P[0,0,1,1]
   PBase ( 20220709,8) ==P[1,1,5,1,0,5,4,4,5]
PBase (27071976,8)== P[1,4,7,2,1,2,7,5,0]