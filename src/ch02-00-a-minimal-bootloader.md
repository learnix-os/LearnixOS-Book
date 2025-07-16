# A Minimal Bootloader

_"From a small spark may burst a mighty flame." — Dante Alighieri_

---

Writing a bootloader is not an easy task, and sometimes it can become even a miniature OS. In this book we will write the minimal needed bootloader to load our kernel, and obtain information that is necessary to it.

In this chapter we will cover:

- How to read from disk
- What is protected mode and how to enter it.
- What is memory paging.
- How to boot the kernel