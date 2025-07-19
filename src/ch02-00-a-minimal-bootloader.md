# A Minimal Bootloader

_"From a small spark may burst a mighty flame." — Dante Alighieri_

---

Writing a bootloader is not an easy task, and it can include a lot of [things](http://wiki.osdev.org/Rolling_Your_Own_Bootloader#A_list_of_things_you_might_want_to_do).
In this book we will write the minimal needed bootloader to load our kernel, and obtain information that is necessary to it.

In this chapter we will implement the following features:

-  Setup registers and stack
-  Enable the A20 line
-  Read kernel from disk
-  Load the global descriptor table 
-  Enable Paging

These features are enough, at least for the start of our kernel, and later in the book you will see we will implement more features like obtaining a memory map, enabling text mode, locate the kernel in the file system and more!