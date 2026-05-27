#!/bin/bash
# Double fork to fully detach from parent
(
  cd /home/z/my-project
  node keep-alive.js >> /home/z/my-project/keeper.log 2>&1
) &
# Exit the intermediate shell immediately
exit 0
