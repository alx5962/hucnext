/*
 * PCE Studio Engine Main Entry Point
 * Compiled with HuC (PC Engine C Compiler)
 */

#include "include/engine.h"
#include "src/pce_system.c"
#include "src/actor.c"
#include "src/camera.c"
#include "src/collision.c"
#include "src/trigger.c"
#include "src/vm.c"
#include "src/engine.c"

main() {
    engine_run();
}
