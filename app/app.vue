<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage :key="$route.fullPath" />
  </div>
</template>
