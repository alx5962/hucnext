#ifndef PCE_ENGINE_H
#define PCE_ENGINE_H

#include "include/pce_system.h"
#include "include/actor.h"
#include "include/camera.h"
#include "include/collision.h"
#include "include/trigger.h"
#include "include/vm.h"

void engine_init(void);
void engine_update(void);
void engine_render(void);
void engine_run(void);

#endif /* PCE_ENGINE_H */
